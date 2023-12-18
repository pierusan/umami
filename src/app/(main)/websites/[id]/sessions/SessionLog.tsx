import { ReactComponentElement, useMemo, useState } from 'react';
import { StatusLight, Icon, Text, SearchField } from 'react-basics';
import { safeDecodeURI } from 'next-basics';
import FilterButtons from 'components/common/FilterButtons';
import Empty from 'components/common/Empty';
import Icons from 'components/icons';
import useMessages from 'components/hooks/useMessages';
import styles from './SessionsLog.module.css';
import stylesSession from './Sessions.module.css';
import { FilterResult, SearchFilter } from 'lib/types';
import { EventData, WebsiteEvent } from '@prisma/client';
import Pager from 'components/common/Pager';

type EventType = 'all' | 'pageview' | 'event';

const typeNumber = (type: EventType) => {
  switch (type) {
    case 'all':
      return 0;
    case 'pageview':
      return 1;
    case 'event':
      return 2;
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = type;
    }
  }
};

const icons: Partial<Record<EventType, ReactComponentElement<typeof Icons.Eye>>> = {
  pageview: <Icons.Eye />,
  event: <Icons.Bolt />,
};

type EventInfo = Omit<WebsiteEvent, 'id' | 'websiteId' | 'sessionId'> & {
  eventData: Omit<EventData, 'id' | 'websiteId' | 'websiteEventId'>[];
};

function SessionLogText({ event, websiteDomain }: { event: EventInfo; websiteDomain: string }) {
  const { formatMessage, labels, messages, FormattedMessage } = useMessages();
  const { eventType, eventName, eventData, urlPath: url, referrerPath } = event;

  switch (eventType) {
    case 2: {
      return (
        <FormattedMessage
          {...messages.eventLog}
          values={{
            event: (
              <b>
                {eventName || formatMessage(labels.unknown)}{' '}
                {eventData.length > 0 ? eventData.map(data => data.stringValue).join(' ') : ''}
              </b>
            ),
            url: (
              <a
                href={`//${websiteDomain}${url}`}
                className={styles.link}
                target="_blank"
                rel="noreferrer noopener"
              >
                {url}
              </a>
            ),
          }}
        />
      );
    }
    case 1:
    default: {
      return (
        <>
          <a
            href={`//${websiteDomain}${url}`}
            className={styles.link}
            target="_blank"
            rel="noreferrer noopener"
          >
            {safeDecodeURI(url)}
          </a>
          {referrerPath && <span className={stylesSession.subtle}> &lt;-- {referrerPath}</span>}
        </>
      );
    }
  }
}

function SessionLogRow({ event, websiteDomain }: { event: EventInfo; websiteDomain: string }) {
  const { createdAt, eventType } = event;

  let color = 'rgba(230, 95, 74, 0.837)';
  let eventTypeName: EventType;
  switch (eventType) {
    case 1: {
      color = '#204c89';
      eventTypeName = 'pageview';
      break;
    }
    case 2: {
      color = '#bc5ace';
      eventTypeName = 'event';
      break;
    }
  }

  return (
    <div
      className={styles.row}
      // style={style}
    >
      <div>
        <StatusLight color={color} />
      </div>
      <div className={styles.time}>
        {new Date(createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })}
      </div>
      <div className={styles.detail}>
        <Icon className={styles.icon}>{icons[eventTypeName]}</Icon>
        <Text>
          <SessionLogText event={event} websiteDomain={websiteDomain} />
        </Text>
      </div>
    </div>
  );
}

export function SessionLog({
  events: eventsArray,
  websiteDomain = '',
  allowPaging = true,
}: {
  events: FilterResult<EventInfo>;
  websiteDomain?: string;
  allowPaging?: boolean;
}) {
  const [params, setParams] = useState<EventInfo | SearchFilter>({
    page: 1,
  });
  const { page, pageSize, count, data: events } = eventsArray || {};

  const [search, setSearch] = useState('');
  const { formatMessage, labels } = useMessages();
  const [filter, setFilter] = useState<EventType>('all');

  const buttons: { label: string; key: EventType }[] = [
    {
      label: formatMessage(labels.all),
      key: 'all',
    },
    {
      label: formatMessage(labels.views),
      key: 'pageview',
    },
    {
      label: formatMessage(labels.events),
      key: 'event',
    },
  ];

  const logs = useMemo(() => {
    if (!events) {
      return [];
    }

    let logs = events;

    if (search) {
      logs = logs.filter(({ eventName, urlPath }) => {
        return [eventName, urlPath]
          .filter(n => n)
          .map(n => n.toLowerCase())
          .join('')
          .includes(search.toLowerCase());
      });
    }

    if (filter !== 'all') {
      return logs.filter(({ eventType }) => eventType === typeNumber(filter));
    }

    return logs;
  }, [events, filter, search]);

  const handlePageChange = (page: number) => {
    setParams({ ...params, page });
  };

  return (
    <div className={styles.table}>
      <div className={styles.actions}>
        <SearchField className={styles.search} value={search} onSearch={setSearch} />
        <FilterButtons items={buttons} selectedKey={filter} onSelect={setFilter} />
      </div>
      {/* TODO: Organize headers by date */}
      {/* <div className={styles.header}>{formatMessage(labels.activityLog)}</div> */}
      <div className={styles.body}>
        {logs?.length === 0 && <Empty />}
        {logs?.length > 0 &&
          // <FixedSizeList width="100%" height={3000} itemCount={logs.length} itemSize={50}>
          // </FixedSizeList>
          logs.map(event => (
            <SessionLogRow
              key={event.createdAt.toString()}
              event={event}
              websiteDomain={websiteDomain}
            />
          ))}
      </div>
      {allowPaging && events.length > 0 && (
        <Pager
          className={styles.pager}
          page={page}
          pageSize={pageSize}
          count={count}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

export default SessionLog;
