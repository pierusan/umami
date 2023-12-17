'use client';
import { useMemo, useState, useEffect } from 'react';
import { subMinutes, startOfMinute } from 'date-fns';
import thenby from 'thenby';
import { Grid, GridRow } from 'components/layout/Grid';
import Page from 'components/layout/Page';
import useApi from 'components/hooks/useApi';
import { useWebsite } from 'components/hooks';
import { percentFilter } from 'lib/filters';
import { REALTIME_RANGE, REALTIME_INTERVAL } from 'lib/constants';
import { RealtimeData } from 'lib/types';
import SessionLog from './SessionLog';
import WebsiteHeader from '../WebsiteHeader';

function mergeData(state = [], data = [], time: number) {
  const ids = state.map(({ id }) => id);
  return state
    .concat(data.filter(({ id }) => !ids.includes(id)))
    .filter(({ timestamp }) => timestamp >= time);
}

export function Realtime({ websiteId }) {
  const [currentData, setCurrentData] = useState<RealtimeData>();
  const { get, useQuery } = useApi();
  const { data: website } = useWebsite(websiteId);
  const { data, isLoading, error } = useQuery({
    queryKey: ['realtime', websiteId],
    queryFn: () => get(`/realtime/${websiteId}`, { startAt: currentData?.timestamp || 0 }),
    enabled: !!(websiteId && website),
    refetchInterval: REALTIME_INTERVAL,
  });

  useEffect(() => {
    if (data) {
      const date = subMinutes(startOfMinute(new Date()), REALTIME_RANGE);
      const time = date.getTime();
      const { pageviews, sessions, events, timestamp } = data;

      setCurrentData(state => ({
        pageviews: mergeData(state?.pageviews, pageviews, time),
        sessions: mergeData(state?.sessions, sessions, time),
        events: mergeData(state?.events, events, time),
        timestamp,
      }));
    }
  }, [data]);

  const realtimeData: RealtimeData = useMemo(() => {
    if (!currentData) {
      return { pageviews: [], sessions: [], events: [], countries: [], visitors: [], timestamp: 0 };
    }

    currentData.countries = percentFilter(
      currentData.sessions
        .reduce((arr, data) => {
          if (!arr.find(({ id }) => id === data.id)) {
            return arr.concat(data);
          }
          return arr;
        }, [])
        .reduce((arr: { x: any; y: number }[], { country }: any) => {
          if (country) {
            const row = arr.find(({ x }) => x === country);

            if (!row) {
              arr.push({ x: country, y: 1 });
            } else {
              row.y += 1;
            }
          }
          return arr;
        }, [])
        .sort(thenby.firstBy('y', -1)),
    );

    currentData.visitors = currentData.sessions.reduce((arr, val) => {
      if (!arr.find(({ id }) => id === val.id)) {
        return arr.concat(val);
      }
      return arr;
    }, []);

    return currentData;
  }, [currentData]);

  if (isLoading || error) {
    return <Page isLoading={isLoading} error={error} />;
  }

  return (
    <>
      <WebsiteHeader websiteId={websiteId} />
      <Grid>
        <GridRow columns="one-two">
          <div></div>
          <SessionLog websiteDomain={website?.domain} data={realtimeData} />
        </GridRow>
      </Grid>
    </>
  );
}

export default Realtime;
