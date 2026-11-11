/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationsReader } from './resolve_event_investigations';

export interface FakeInvestigation {
  id: string;
  alertIds: string[];
  open?: boolean;
  inProgress?: boolean;
  updatedAt?: string;
}

export const toInvestigationSummary = ({
  id,
  alertIds,
  open = true,
  inProgress = false,
  updatedAt = '2026-11-04T10:00:00.000Z',
}: FakeInvestigation) => ({
  id,
  metadata: { status: open ? 'open' : 'closed' },
  in_progress: inProgress,
  updated_at: updatedAt,
  subjects: alertIds.map((alertId) => ({ type: 'alert', id: alertId })),
});

/** A reader over fake investigations: the subject lookup returns every one that holds a requested alert. */
export const createInvestigationsReader = ({
  investigations,
  total,
  failList,
  failSubjects,
  hangSubjects,
  unreadableIds = [],
}: {
  investigations: FakeInvestigation[];
  total?: number;
  failList?: boolean;
  failSubjects?: (keys: Array<{ id: string }>) => boolean;
  hangSubjects?: boolean;
  /** Conversation ids the subject lookup returns but `list` omits (no access). */
  unreadableIds?: string[];
}) => {
  const findConversationIdsBySubjects = jest.fn(async (keys: Array<{ id: string }>) => {
    if (hangSubjects) return new Promise<string[]>(() => {});
    if (failSubjects?.(keys)) throw new Error('refused');
    return [
      ...investigations
        .filter(({ alertIds }) => keys.some(({ id }) => alertIds.includes(id)))
        .map(({ id }) => id),
      ...unreadableIds,
    ];
  });
  const list = jest.fn(async ({ id }: { id?: string[]; per_page?: number } = {}) => {
    if (failList) throw new Error('missing read_investigations');
    const results = (
      id ? investigations.filter((item) => id.includes(item.id)) : investigations
    ).map(toInvestigationSummary);
    return { results, pagination: { page: 1, per_page: 100, total: total ?? results.length } };
  });
  const reader = {
    getSubjectsClient: () => ({ findConversationIdsBySubjects }),
    getInvestigationsClient: () => ({ list }),
  } as unknown as InvestigationsReader;
  return { reader, findConversationIdsBySubjects, list };
};
