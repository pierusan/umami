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

export interface SessionSearchFilter extends Omit<SearchFilter, 'query'>, SessionFilter {}

export async function getSessionsByWebsiteId(
  filters?: SessionSearchFilter,
): Promise<FilterResult<Session>> {
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
    ...pageFilters,
  });

  const count = await prisma.client.session.count({ where });

  return { data: sessions, count, ...getParameters };
}
