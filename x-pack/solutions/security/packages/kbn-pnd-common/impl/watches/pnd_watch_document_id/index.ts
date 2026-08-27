/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_IDS } from '../../../constants';

/** Catalog watches install per-space as `${definitionId}-${spaceId}`. */
export const pndWatchDocumentId = (definitionId: string, spaceId: string): string =>
  `${definitionId}-${spaceId}`;

const isCatalogWatchId = (workflowId: string): boolean =>
  (SYSTEM_SECURITY_WATCH_IDS as readonly string[]).includes(workflowId);

/**
 * Map a live execution `workflowId` back to a catalog definition id.
 *
 * Accepts the definition id itself, or the per-space document id when `spaceId` is
 * passed. Any other suffix is rejected so `system-security-watch-floor-evil` cannot
 * become a PND watch.
 */
export const resolvePndWatchDefinitionId = (
  workflowId: string,
  spaceId?: string
): string | undefined => {
  if (isCatalogWatchId(workflowId)) {
    return workflowId;
  }

  if (spaceId == null || spaceId.length === 0) {
    return undefined;
  }

  const suffix = `-${spaceId}`;
  if (!workflowId.endsWith(suffix)) {
    return undefined;
  }

  const definitionId = workflowId.slice(0, -suffix.length);
  return isCatalogWatchId(definitionId) ? definitionId : undefined;
};
