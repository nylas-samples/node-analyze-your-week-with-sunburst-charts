import React, { useState, useEffect } from 'react';
import { useNylas } from '@nylas/nylas-react';
import CalendarApp from './CalendarApp';
import NylasLogin from './NylasLogin';
import Layout from './components/Layout';

import {
  getSevenDaysAgoFromTodayDateTimestamp,
  getSevenDaysFromTodayDateTimestamp,
} from './utils/date';

function App() {
  const nylas = useNylas();
  const [primaryCalendar, setPrimaryCalendar] = useState(null);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [burners, setBurners] = useState(null);
  const [burnersCount, setBurnersCount] = useState(null);
  const serverBaseUrl =
    import.meta.env.VITE_SERVER_URI || 'http://localhost:9000';

  useEffect(() => {
    const script = document.createElement('script');
  
    script.src = "https://cdn.plot.ly/plotly-2.18.2.min.js";
    script.async = true;
  
    document.body.appendChild(script);
  
    return () => {
      document.body.removeChild(script);
    }
  }, []);

  useEffect(() => {
    if (!nylas) {
      return;
    }

    // Handle the code that is passed in the query params from Nylas after a successful login
    const params = new URLSearchParams(window.location.search);
    if (params.has('code')) {
      nylas
        .exchangeCodeFromUrlForToken()
        .then((user) => {
          const { id } = JSON.parse(user);
          setUserId(id);
          sessionStorage.setItem('userId', id);
        })
        .catch((error) => {
          console.error('An error occurred parsing the response:', error);
        });
    }
  }, [nylas]);

  useEffect(() => {
    const userIdString = sessionStorage.getItem('userId');
    const userEmail = sessionStorage.getItem('userEmail');
    if (userIdString) {
      setUserId(userIdString);
    }
    if (userEmail) {
      setUserEmail(userEmail);
    }
    if (userIdString) {
      setUserId(userIdString);
    }
  }, []);

  useEffect(() => {
    if (userId?.length) {
      window.history.replaceState({}, '', `/?userId=${userId}`);
      getPrimaryCalendarEvents();
    } else {
      window.history.replaceState({}, '', '/');
    }
  }, [userId]);

  const getPrimaryCalendar = async () => {
    try {
      const url = serverBaseUrl + '/nylas/read-calendars';

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: userId,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(res.statusText);
      }

      const data = await res.json();

      let [calendar] = data.filter((calendar) => calendar.name === "‘Unrealistic’ Schedule");
      // if no primary calendar, use the first one
      if (!calendar && data.length) {
        calendar = data[0];
      }

      setPrimaryCalendar(calendar);
      return calendar;
    } catch (err) {
      console.warn(`Error reading calendars:`, err);
    }
  };

  const getCalendarEvents = async (calendarId) => {
    if (calendarId) {
      try {
        const startsAfter = getSevenDaysAgoFromTodayDateTimestamp(); // 7 days ago from today
        const endsBefore = getSevenDaysFromTodayDateTimestamp(); // 7 days from today
        
        const queryParams = new URLSearchParams({
          limit: 250,
          startsAfter,
          endsBefore,
          calendarId,
        });

        const url = `${serverBaseUrl}/nylas/read-events?${queryParams.toString()}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: userId,
            'Content-Type': 'application/json',
          },
          params: {
            calendarId,
          },
        });

        if (!res.ok) {
          throw new Error(res.statusText);
        }

        const data = (await res.json()).filter(
          (event) => event.status !== 'cancelled'
        );

        const burners = {
          Health: {},
          Family: {},
          Friends: {},
          Work: {},
        }

        const burnersCount = {
          Health: 0,
          Family: 0,
          Friends: 0,
          Work: 0,
        }

        data.map(event => {
          const [burner, item] = event.title.split(": ");
          const modifiedBurner = burner === "Self" ? "Health" : burner;
          const duration = event.when.end_time - event.when.start_time;

          if(item in burners[modifiedBurner]) {
            burnersCount[modifiedBurner] += duration;
            burners[modifiedBurner][item] = burners[modifiedBurner][item] + duration;
          } else {
            burnersCount[modifiedBurner] += duration;
            burners[modifiedBurner][item] = duration;
          }
        });

        setBurners(burners);
        setBurnersCount(burnersCount);
        setEvents(data);
        setIsLoading(false);
      } catch (err) {
        console.warn(`Error reading calendar events:`, err);
      }
    }
  };

  const getPrimaryCalendarEvents = async () => {
    setIsLoading(true);
    const primaryCalendar = await getPrimaryCalendar();
    await getCalendarEvents(primaryCalendar?.id);
    setIsLoading(false);
  };

  const disconnectUser = () => {
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userEmail');
    setUserId('');
    setUserEmail('');
  };

  const refresh = () => {
    getPrimaryCalendarEvents();
  };

  return (
    <Layout
      showMenu={!!userId}
      disconnectUser={disconnectUser}
      isLoading={isLoading}
      refresh={refresh}
    >
      {!userId ? (
        <NylasLogin email={userEmail} setEmail={setUserEmail} />
      ) : (
        <div className="app-card">
          <CalendarApp
            userId={userId}
            calendarId={primaryCalendar?.id}
            serverBaseUrl={serverBaseUrl}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            events={events}
            refresh={refresh}
            burners={burners}
            burnersCount={burnersCount}
          />
        </div>
      )}
    </Layout>
  );
}

export default App;
