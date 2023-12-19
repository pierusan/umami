import * as yup from 'yup';
import { useAuth, useCors, useValidate } from 'lib/middleware';
import { pageInfo } from 'lib/schema';
import {
  SessionEventsSearchFilter,
  getSessionInfoAndEvents,
} from 'queries/analytics/sessions/getSessionsForPierre';
import { NextApiRequestQueryBody } from 'lib/types';
import { NextApiResponse } from 'next';
import { methodNotAllowed, ok, unauthorized } from 'next-basics';
import { canViewWebsite } from 'lib/auth';

const schema = {
  GET: yup.object().shape({
    id: yup.string().uuid().required(),
    page: pageInfo.page,
    pageSize: pageInfo.pageSize,
    orderBy: pageInfo.orderBy,
    sortDescending: pageInfo.sortDescending,
  } satisfies Record<keyof Required<SessionEventsRequestQuery>, any>),
};

export interface SessionEventsRequestQuery extends SessionEventsSearchFilter {
  id: string;
}

export default async (
  req: NextApiRequestQueryBody<SessionEventsRequestQuery>,
  res: NextApiResponse,
) => {
  await useCors(req, res);
  await useAuth(req, res);
  await useValidate(schema, req, res);

  if (req.method === 'GET') {
    const {
      id: sessionId,
      page = 1,
      pageSize = 200,
      orderBy = 'createdAt',
      sortDescending = 'true',
    } = req.query;
    const sessionInfoAndEvents = await getSessionInfoAndEvents(sessionId, {
      page,
      pageSize,
      orderBy,
      sortDescending,
    });

    if (!(await canViewWebsite(req.auth, sessionInfoAndEvents.info.websiteId))) {
      return unauthorized(res);
    }

    return ok(res, sessionInfoAndEvents);
  }

  return methodNotAllowed(res);
};
