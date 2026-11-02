/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { lazySchema, z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { KNOWLEDGE_PURGE_CONFIRMATION } from '../../common/purge';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

/** Irreversible and space-wide, so it needs configure as well as manage. */
const purgePrivileges = [
  NIGHTSHIFT_API_PRIVILEGES.configure,
  NIGHTSHIFT_API_PRIVILEGES.manage,
  'agentBuilder:read',
];

const sinceSchema = () =>
  z
    .string()
    .min(1)
    .max(40)
    .refine((value) => Number.isFinite(Date.parse(value)), {
      message: 'since must be an ISO 8601 timestamp',
    });

/** A cutoff in the future would purge nothing and usually means the operator mistyped a date. */
const assertCutoffIsPast = (since: string) => {
  if (Date.parse(since) > Date.now()) {
    throw badRequest('The purge cutoff must be in the past.');
  }
};

export const previewKnowledgePurgeRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/knowledge/purge/preview',
  options: {
    access: 'internal',
    summary: 'Preview what a knowledge purge would delete',
    description:
      'Counts the Semantic Memory pages, Cortex pages, decision-tree documents and investigation ' +
      'conversations in this space that were written at or after the cutoff. Reads only.',
  },
  security: { authz: { requiredPrivileges: purgePrivileges } },
  params: lazySchema(() =>
    z.object({
      query: z.object({ since: sinceSchema() }),
    })
  ),
  handler: async ({ request, params, getKnowledgePurgeClient }) => {
    const { since } = params.query;
    assertCutoffIsPast(since);
    return getKnowledgePurgeClient(request).preview(since);
  },
});

/** ES does not guarantee erasure from existing segments or snapshots — never call this a secure erase. */
export const purgeKnowledgeRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/knowledge/purge',
  options: {
    access: 'internal',
    summary: 'Delete everything Nightshift learned after a point in time',
    description:
      'Permanently removes the Semantic Memory pages, Cortex pages, decision-tree documents and ' +
      'investigation conversations in this space that were written at or after the cutoff. ' +
      'Irreversible; intended as the recovery path after a suspected prompt-injection run.',
  },
  security: { authz: { requiredPrivileges: purgePrivileges } },
  params: lazySchema(() =>
    z.object({
      body: z.object({
        since: sinceSchema(),
        /** Echoed by the UI so a stray POST cannot wipe a space. */
        confirm: z.literal(KNOWLEDGE_PURGE_CONFIRMATION),
      }),
    })
  ),
  handler: async ({ request, params, getKnowledgePurgeClient }) => {
    const { since } = params.body;
    assertCutoffIsPast(since);
    return getKnowledgePurgeClient(request).purge(since);
  },
});
