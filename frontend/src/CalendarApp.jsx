import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import EventList from './EventList';
import EventDetail from './EventDetail';
import Toast from './components/Toast';
import './styles/calendar.scss';

function CalendarApp({
  userId,
  isLoading,
  setIsLoading,
  events,
  burners,
  burnersCount,
}) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [toastNotification, setToastNotification] = useState('');

  let parents = [];
  let labels = []
  let values = []

  if(burners) {
    Object.keys(burners).map(burner => {
      parents.push("Burners");
      labels.push(burner);
      values.push(burnersCount[burner])
  
      Object.keys(burners[burner]).map(item => {
        parents.push(burner);
        labels.push(item);
        values.push(burners[burner][item])
      });
    });

    var data = [{
      type: "sunburst",
      labels: ["Burners", ...labels], // events: Code, Content, Walk Dog
      parents: ["", ...parents], // Work, Family, Friend, Health
      values:  [0, ...values], // seconds for each event
      outsidetextfont: {size: 32, color: "#377eb8"},
      insidetextfont: {size: 18},
      leaf: {opacity: 0.9},
      marker: {line: {width: 4}},
    }];
    
    var layout = {
      margin: {l: 0, r: 0, b: 0, t: 0},
      width: 650,
      height: 650
    };
  }
  
  useEffect(() => {
    if(showChart) Plotly.newPlot('plotly', data, layout);
  }, [showChart])
  
  return (
    <>
      <Toast
        toastNotification={toastNotification}
        setToastNotification={setToastNotification}
      />

      <div className="calendar-app">
        <>
          <div className="event-list-view">
            <section className="event-header">
              <p className="title">Upcoming events</p>
              <p
                className={`create-event${showChart ? ' hide' : ''}`}
                // Only should be possible if data exists
                onClick={() => setShowChart(true)}
              >
                Generate Sunburst Chart
              </p>
            </section>
            <EventList
              events={events}
              userId={userId}
              setSelectedEvent={setSelectedEvent}
              selectedEvent={selectedEvent}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
            />
          </div>
          {showChart ? (
            <div id="plotly" style={{ width: '50%', height: '50%', alignContent: 'center' }}/>
          ) : (
            <EventDetail selectedEvent={selectedEvent} />
          )}
        </>
      </div>
      <div className="mobile-warning hidden-desktop">
        <h2>
          Calendar sample app is currently designed for a desktop experience.
        </h2>
        <p>
          Visit Nylas dashboard for more use-cases: https://dashboard.nylas.com
        </p>
      </div>
    </>
  );
}

CalendarApp.propTypes = {
  userId: PropTypes.string.isRequired,
  calendarId: PropTypes.string,
  serverBaseUrl: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  setIsLoading: PropTypes.func.isRequired,
  events: PropTypes.array.isRequired,
  refresh: PropTypes.func,
};

export default CalendarApp;
