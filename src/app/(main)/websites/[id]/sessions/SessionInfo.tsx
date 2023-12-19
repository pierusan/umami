import {
  type EventStats,
  type ExtendedSession,
} from 'queries/analytics/sessions/getSessionsForPierre';
import { formatDate } from './SessionSelector';
import styles from './Sessions.module.css';
import classNames from 'classnames';

export function SessionInfo({
  info,
  eventStats,
  allEventStats,
}: {
  info: ExtendedSession;
  eventStats: EventStats;
  allEventStats: EventStats;
}) {
  const {
    browser,
    city,
    country,
    createdAt,
    device,
    hostname,
    language,
    latestEventAt,
    os,
    region,
    screen,
  } = info;
  return (
    <>
      <div>
        <p>
          <b>Last Event: {formatDate(new Date(latestEventAt))}</b>
        </p>
        <p>Session Start: {formatDate(new Date(createdAt))}</p>
        <p>
          {country} {region} {city}
        </p>
        <p>
          {browser} {language}
        </p>
        <p>
          {device} {screen} {os}
        </p>
        <p>{hostname}</p>
      </div>
      <div>
        {allEventStats.eventNames
          .sort(({ eventType: typeA }, { eventType: typeB }) => typeA - typeB)
          .map(({ eventType, eventName, urlPath }) => {
            const countInSession = eventStats.eventNames.find(
              ({ eventName: eventNameInSession, urlPath: urlPathInSession }) =>
                eventNameInSession === eventName && urlPathInSession === urlPath,
            )?._count;

            if (eventType === 2) {
              return (
                <p
                  key={eventName}
                  className={classNames({
                    [styles.subtle]: !countInSession,
                  })}
                >
                  {eventName}
                  {countInSession && ` (${countInSession})`}
                </p>
              );
            } else {
              return (
                <p
                  key={urlPath}
                  className={classNames({
                    [styles.subtle]: !countInSession,
                  })}
                >
                  {urlPath}
                  {countInSession && ` (${countInSession})`}
                </p>
              );
            }
          })}
        {allEventStats.eventData
          .filter(({ eventKey }) => eventKey === 'resource')
          .map(({ stringValue }) => {
            const countInSession = eventStats.eventData.find(
              ({ stringValue: val }) => val === stringValue,
            )?._count;
            return (
              <p
                key={stringValue}
                className={classNames({
                  [styles.subtle]: !countInSession,
                })}
              >
                {stringValue}
                {countInSession && ` (${countInSession})`}
              </p>
            );
          })}
      </div>
    </>
  );
}
