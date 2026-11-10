/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { CaseStatuses } from '@kbn/cases-components/src/status/types';
import { isBoom } from '@hapi/boom';
import { SECURITY_ENTITY_ATTACHMENT_TYPE, SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import type { CasesClient } from '@kbn/cases-plugin/server';

/** The most attachment ids the Cases client looks up at once. */
const MAX_ATTACHMENT_IDS_PER_LOOKUP = 1000;

/**
 * Whether the Cases client refused the user. It wraps what it throws, keeping the original
 * error, which carries the status.
 */
export const isCasesForbiddenError = (error: unknown): boolean => {
  const { wrappedError } = error as { wrappedError?: unknown };
  return isBoom(wrappedError) && wrappedError.output.statusCode === 403;
};

/**
 * The open and in-progress Security cases the user can read, per entity id. Entities without such
 * cases are left out. A group's cases are the distinct cases of its main entity and members, so a
 * shared case counts once. Throws when the user can't read Security cases (see `isCasesForbiddenError`).
 */
export const fetchEntityCaseCounts = async (
  casesClient: CasesClient,
  entityIds: readonly string[],
  memberIds: Readonly<Record<string, readonly string[]>> = {}
): Promise<Map<string, number>> => {
  if (entityIds.length === 0) return new Map();
  const attachedIds = [...new Set([...entityIds, ...Object.values(memberIds).flat()])];
  const casesOfAttachments = (
    await Promise.all(
      chunk(attachedIds, MAX_ATTACHMENT_IDS_PER_LOOKUP).map((attachmentIds) =>
        casesClient.cases.getCasesByAttachmentIDs({
          type: SECURITY_ENTITY_ATTACHMENT_TYPE,
          owner: SECURITY_SOLUTION_OWNER,
          attachmentIds,
          status: [CaseStatuses.open, CaseStatuses['in-progress']],
        })
      )
    )
  ).flat();
  const caseIdsByEntity = new Map(
    casesOfAttachments.map(({ attachmentId, caseIds }) => [attachmentId, caseIds])
  );
  return new Map(
    entityIds.flatMap((entityId) => {
      const caseIds = new Set(
        [entityId, ...(memberIds[entityId] ?? [])].flatMap((id) => caseIdsByEntity.get(id) ?? [])
      );
      return caseIds.size > 0 ? [[entityId, caseIds.size] as const] : [];
    })
  );
};
