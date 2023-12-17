import { EventData, Prisma, Session, WebsiteEvent } from '@prisma/client';
import prisma from 'lib/prisma';
import { type FilterResult, type SearchFilter } from 'lib/types';

interface SessionFilter {
  websiteId: string;
  os?: string;
  browser?: string;
  device?: string;
  country?: string;
  language?: string;
  region?: string;
  city?: string;
}

interface ExtendedSession extends Omit<Session, 'subdivision1'> {
  region: string;
  pageViews: number;
  latestEventAt: Date;
}

export interface SessionSearchFilter extends Omit<SearchFilter, 'query'>, SessionFilter {}
export interface SessionEventsSearchFilter extends Omit<SearchFilter, 'query'> {}

interface PrismaExtendedSession extends Session {
  websiteEvent: {
    createdAt: Date;
  }[];
  _count: {
    websiteEvent: number;
  };
}
function renameExtendedSession(prismaExtendedSession: PrismaExtendedSession) {
  const { _count, websiteEvent, subdivision1, ...rest } = prismaExtendedSession;

  return {
    ...rest,
    pageViews: _count.websiteEvent,
    latestEventAt: websiteEvent?.[0]?.createdAt,
    region: subdivision1,
  };
}

export async function getSessionsByWebsiteId(
  filters?: SessionSearchFilter,
): Promise<FilterResult<ExtendedSession>> {
  const { websiteId, os, browser, device, country, language, region, city, ...rest } =
    filters || {};

  const [pageFilters, getParameters] = prisma.getPageFilters(rest);

  const where: Prisma.SessionWhereInput = {
    websiteId,
    os,
    browser,
    device,
    country,
    language,
    city,
    subdivision1: region,
  } satisfies Omit<Record<keyof Required<SessionFilter>, any>, 'region'> & {
    subdivision1?: string;
  };

  const sessions = await prisma.client.session.findMany({
    where,
    include: {
      _count: {
        select: {
          websiteEvent: { where: { eventType: 1 } },
        },
      },
      websiteEvent: { take: 1, orderBy: { createdAt: 'desc' }, select: { createdAt: true } },
    },
    ...pageFilters,
  });

  const sessionsRenamed = sessions.map(prismaExtendedSession =>
    renameExtendedSession(prismaExtendedSession),
  );

  const count = await prisma.client.session.count({ where });

  return { data: sessionsRenamed, count, ...getParameters };
}

async function getSessionInfo(sessionId: string): Promise<ExtendedSession> {
  const session = await prisma.client.session.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: {
          websiteEvent: { where: { eventType: 1 } },
        },
      },
      websiteEvent: { take: 1, orderBy: { createdAt: 'desc' }, select: { createdAt: true } },
    },
  });

  return renameExtendedSession(session);
}

type EventStats = {
  eventNames: ({ _count: number } & Pick<WebsiteEvent, 'eventName' | 'eventType'>)[];
  eventData: ({ _count: number } & Pick<
    EventData,
    'eventKey' | 'stringValue' | 'dataType' | 'numberValue' | 'dateValue'
  >)[];
};

async function getSessionEvents(
  sessionId: string,
  filters?: SessionEventsSearchFilter,
): Promise<{
  events: FilterResult<Omit<WebsiteEvent, 'id' | 'websiteId' | 'sessionId'>>;
  eventStats: EventStats;
  allEventStats: EventStats;
}> {
  const [pageFilters, getParameters] = prisma.getPageFilters(filters);

  const where: Prisma.WebsiteEventWhereInput = {
    sessionId,
  };

  const [sessionEvents, eventNamesStats, eventDataStats, allEventNamesStats, allEventDataStats] =
    await Promise.all([
      prisma.client.websiteEvent.findMany({
        where,
        select: {
          createdAt: true,
          eventName: true,
          eventType: true,
          pageTitle: true,
          urlPath: true,
          urlQuery: true,
          referrerDomain: true,
          referrerPath: true,
          referrerQuery: true,
          eventData: {
            orderBy: { createdAt: 'desc' },
            select: {
              createdAt: true,
              dataType: true,
              dateValue: true,
              eventKey: true,
              numberValue: true,
              stringValue: true,
            },
          },
        },
        ...pageFilters,
      }),
      prisma.client.websiteEvent.groupBy({
        where,
        by: ['eventName', 'eventType'],
        _count: true,
      }),
      prisma.client.eventData.groupBy({
        where: { websiteEvent: { sessionId } },
        by: ['eventKey', 'stringValue', 'dataType', 'numberValue', 'dateValue'],
        _count: true,
      }),
      // Add stats about all the events to compare this session with others and
      // to know what has and hasn't been clicked on.
      prisma.client.websiteEvent.groupBy({
        by: ['eventName', 'eventType'],
        _count: true,
      }),
      prisma.client.eventData.groupBy({
        by: ['eventKey', 'stringValue', 'dataType', 'numberValue', 'dateValue'],
        _count: true,
      }),
    ]);

  const count = await prisma.client.websiteEvent.count({ where });

  return {
    eventStats: {
      eventNames: eventNamesStats,
      eventData: eventDataStats,
    },
    allEventStats: {
      eventNames: allEventNamesStats,
      eventData: allEventDataStats,
    },
    events: {
      data: sessionEvents,
      count,
      ...getParameters,
    },
  };
}

export async function getSessionInfoAndEvents(
  sessionId: string,
  filters?: SessionEventsSearchFilter,
) {
  const [sessionInfo, events] = await Promise.all([
    getSessionInfo(sessionId),
    getSessionEvents(sessionId, filters),
  ]);

  return { info: sessionInfo, ...events };
}
