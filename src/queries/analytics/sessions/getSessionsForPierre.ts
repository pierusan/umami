import { Prisma, Session } from '@prisma/client';
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

interface SessionResult extends Omit<Session, 'subdivision1'> {
  region: string;
  pageViews: number;
  latestEventAt: Date;
}

export interface SessionSearchFilter extends Omit<SearchFilter, 'query'>, SessionFilter {}

export async function getSessionsByWebsiteId(
  filters?: SessionSearchFilter,
): Promise<FilterResult<SessionResult>> {
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

  const sessionsRenamed = sessions.map(({ _count, websiteEvent, subdivision1, ...rest }) => ({
    ...rest,
    latestEventAt: websiteEvent?.[0]?.createdAt,
    pageViews: _count.websiteEvent,
    region: subdivision1,
  }));

  const count = await prisma.client.session.count({ where });

  return { data: sessionsRenamed, count, ...getParameters };
}
