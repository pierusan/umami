'use client';
import { Grid, GridRow } from 'components/layout/Grid';
import Page from 'components/layout/Page';
import { useApi, useNavigation, useWebsite } from 'components/hooks';
import SessionLog from './SessionLog';
import WebsiteHeader from '../WebsiteHeader';
import { SessionSelector } from './SessionSelector';
import { usePathname } from 'next/navigation';
import FilterTags from 'components/metrics/FilterTags';
import { useQuery } from '@tanstack/react-query';
import { EventStats, type ExtendedSession } from 'queries/analytics/sessions/getSessionsForPierre';
import { Loading } from 'react-basics';
import ErrorMessage from 'components/common/ErrorMessage';
import { SessionInfo } from './SessionInfo';
import { FilterResult } from 'lib/types';
import { EventData, WebsiteEvent } from '@prisma/client';

export function Sessions({ websiteId }) {
  const { data: website, isLoading: websiteIsLoading, error: websiteError } = useWebsite(websiteId);
  const pathname = usePathname();
  const showLinks = !pathname.includes('/share/');

  const {
    query: { os, browser, device, country, region, city, hostname, sessionId },
  } = useNavigation();

  const { get } = useApi();
  const {
    data: sessionInfoAndEvents,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useQuery({
    queryKey: ['session-info-and-events', sessionId],
    queryFn: (): Promise<{
      info: ExtendedSession;
      eventStats: EventStats;
      allEventStats: EventStats;
      events: FilterResult<
        Omit<WebsiteEvent, 'id' | 'websiteId' | 'sessionId'> & {
          eventData: Omit<EventData, 'id' | 'websiteId' | 'websiteEventId'>[];
        }
      >;
    }> => get(`/sessions-for-pierre/${sessionId}`),
    enabled: Boolean(sessionId),
    refetchInterval: 10_000, // refetch every 10 seconds
  });

  if (websiteIsLoading || websiteError) {
    return <Page isLoading={websiteIsLoading} error={websiteError} />;
  }

  const { info, eventStats, allEventStats, events } = sessionInfoAndEvents ?? {};

  return (
    <>
      <WebsiteHeader websiteId={websiteId} showLinks={showLinks} />
      <FilterTags params={{ os, browser, device, country, region, city, hostname }} />
      <SessionSelector websiteId={websiteId} sticky={true} />
      {isSessionLoading && <Loading position="center" icon="dots" />}
      {sessionError && <ErrorMessage />}
      {sessionId && !isSessionLoading && !sessionError && (
        <Grid>
          <GridRow columns="one-two">
            <SessionInfo info={info} eventStats={eventStats} allEventStats={allEventStats} />
            <SessionLog websiteDomain={website?.domain} events={events} />
          </GridRow>
        </Grid>
      )}
    </>
  );
}

export default Sessions;
