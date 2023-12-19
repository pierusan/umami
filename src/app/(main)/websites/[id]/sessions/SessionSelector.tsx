'use client';

import classNames from 'classnames';
import { useApi, useMessages, useNavigation, useSticky } from 'components/hooks';
import {
  Button,
  Dropdown,
  Icon,
  Icons,
  Item,
  Loading,
  Popup,
  PopupTrigger,
  Text,
} from 'react-basics';
import styles from './Sessions.module.css';
import { useQuery } from '@tanstack/react-query';
import { Session as PrismaSession } from '@prisma/client';
import ErrorMessage from 'components/common/ErrorMessage';
import PopupForm from 'app/(main)/reports/[id]/PopupForm';
import FilterSelectForm from 'app/(main)/reports/[id]/FilterSelectForm';

type Session = {
  id: string;
  os: string;
  browser: string;
  device: string;
  country: string;
  language: string;
  region: string;
  city: string;
  createdAt: Date;
  latestEventAt: Date;
  pageViews: number;
};

function parseData(data: any[]): Session[] {
  if (!data) return [];

  return data.map(session => {
    return {
      id: session.id as string,
      os: session.os as string,
      browser: session.browser as string,
      device: session.device as string,
      country: session.country as string,
      language: session.language as string,
      region: session.region as string,
      city: session.city as string,
      createdAt: new Date(session.createdAt),
      latestEventAt: new Date(session.latestEventAt),
      pageViews: +(session.pageViews as string),
    } satisfies Partial<PrismaSession> & { region: string; latestEventAt: Date; pageViews: number };
  });
}

export function formatDate(date: Date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatSession(session: Session) {
  const {
    latestEventAt,
    pageViews,
    createdAt,
    // country,
    // region,
    city,
    device,
    // os,
    // browser,
    // language,
  } = session;
  return (
    <p>
      <b>{formatDate(latestEventAt)}</b> _ Views: {pageViews} _ {formatDate(createdAt)} _ {city} _{' '}
      {device}
    </p>
  );
}

function SessionsFilterButton({ websiteId, className }: { websiteId: string; className?: string }) {
  const { formatMessage, labels } = useMessages();
  const { makeUrl, router } = useNavigation();

  const fieldOptions = [
    { name: 'browser', type: 'string', label: formatMessage(labels.browser) },
    { name: 'os', type: 'string', label: formatMessage(labels.os) },
    { name: 'device', type: 'string', label: formatMessage(labels.device) },
    { name: 'country', type: 'string', label: formatMessage(labels.country) },
    { name: 'region', type: 'string', label: formatMessage(labels.region) },
    { name: 'city', type: 'string', label: formatMessage(labels.city) },
    { name: 'hostname', type: 'string', label: formatMessage(labels.hostname) },
  ];

  const handleAddFilter = ({ name, value }) => {
    // Reset session selection when a filter is added
    router.push(makeUrl({ [name]: value, sessionId: undefined }));
  };

  return (
    <PopupTrigger>
      <Button className={className}>
        <Icon>
          <Icons.Plus />
        </Icon>
        <Text>{formatMessage(labels.filter)}</Text>
      </Button>
      <Popup position="bottom" alignment="end">
        {(close: () => void) => {
          return (
            <PopupForm className={styles.filterPopup}>
              <FilterSelectForm
                websiteId={websiteId}
                items={fieldOptions}
                onSelect={value => {
                  handleAddFilter(value);
                  close();
                }}
                allowFilterSelect={false}
              />
            </PopupForm>
          );
        }}
      </Popup>
    </PopupTrigger>
  );
}

function SessionDropdown({ websiteId }: { websiteId: string }) {
  const { get } = useApi();

  const {
    router,
    makeUrl,
    query: { os, browser, device, country, region, city, sessionId },
  } = useNavigation();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sessions-list', websiteId, os, browser, device, country, region, city],
    queryFn: () =>
      get(`/sessions-for-pierre`, { websiteId, os, browser, device, country, region, city }),
    enabled: Boolean(websiteId),
    refetchInterval: 10_000, // Refetch list 10 seconds
  });

  if (isLoading) {
    return <Loading position="center" icon="dots" />;
  }
  if (error) {
    return <ErrorMessage />;
  }

  const sessions = parseData(data.data);

  const options = sessions.map(session => ({ label: formatSession(session), value: session.id }));

  // Use query params to keep the filter state
  const handleChange = (sessionId: any) => {
    router.push(makeUrl({ sessionId }));
  };

  const renderValue = (value: string) => {
    return options.find(e => e.value === value).label;
  };

  return (
    <Dropdown
      items={options}
      renderValue={renderValue}
      value={sessionId}
      alignment={'start'}
      placeholder="select session"
      onChange={key => handleChange(key as any)}
    >
      {({ label, value, divider }) => (
        <Item key={value} divider={divider}>
          {label}
        </Item>
      )}
    </Dropdown>
  );
}

export function SessionSelector({ websiteId, sticky }: { websiteId: string; sticky?: boolean }) {
  const { ref, isSticky } = useSticky({ enabled: sticky });

  return (
    <div
      ref={ref}
      className={classNames(styles.selectorRow, {
        [styles.sticky]: sticky,
        [styles.isSticky]: isSticky,
      })}
    >
      <SessionDropdown websiteId={websiteId} />
      <SessionsFilterButton websiteId={websiteId} />
    </div>
  );
}
