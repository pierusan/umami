import { useAuth, useCors, useValidate } from 'lib/middleware';
import { NextApiRequestQueryBody } from 'lib/types';
import { NextApiResponse } from 'next';
import { methodNotAllowed, ok, unauthorized } from 'next-basics';
import * as yup from 'yup';
import { pageInfo } from 'lib/schema';
import { canViewWebsite } from 'lib/auth';
import {
  SessionSearchFilter,
  getSessionsByWebsiteId,
} from 'queries/analytics/sessions/getSessionsForPierre';

export interface SessionsRequestQuery extends SessionSearchFilter {}

const schema = {
  GET: yup.object().shape({
    websiteId: yup.string().uuid().required(),
    os: yup.string(),
    browser: yup.string(),
    device: yup.string(),
    country: yup.string(),
    region: yup.string(),
    city: yup.string(),
    language: yup.string(),
    page: pageInfo.page,
    pageSize: pageInfo.pageSize,
    orderBy: pageInfo.orderBy,
    sortDescending: pageInfo.sortDescending,
  } satisfies Record<keyof Required<SessionsRequestQuery>, any>),
};

export default async (req: NextApiRequestQueryBody<SessionsRequestQuery>, res: NextApiResponse) => {
  await useCors(req, res);
  await useAuth(req, res);
  await useValidate(schema, req, res);

  if (req.method === 'GET') {
    const {
      websiteId,
      page = 1,
      pageSize = 200,
      orderBy = 'createdAt',
      sortDescending = 'true',
      ...rest
    } = req.query;

    if (!(await canViewWebsite(req.auth, websiteId))) {
      return unauthorized(res);
    }

    const sessions = await getSessionsByWebsiteId({
      websiteId,
      page,
      pageSize: +pageSize || undefined,
      orderBy,
      sortDescending,
      ...rest,
    });

    return ok(res, sessions);
  }

  return methodNotAllowed(res);
};
