/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Kibana space used by space_isolation examples. Intentionally has no
 * `.alerts-security.alerts-<spaceId>` alias so `security.alerts` must return
 * the successful 0-alert early path instead of leaking default-space alerts.
 */
export const ALERTS_RAG_EMPTY_SPACE_ID = 'alerts-rag-empty';

/**
 * Creates {@link ALERTS_RAG_EMPTY_SPACE_ID} when missing. Idempotent.
 */
export const ensureEmptyAlertsSpace = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  try {
    await fetch(`/api/spaces/space/${encodeURIComponent(ALERTS_RAG_EMPTY_SPACE_ID)}`, {
      method: 'GET',
      version: '2023-10-31',
    });
    log.info(`[alerts-rag] space "${ALERTS_RAG_EMPTY_SPACE_ID}" already exists`);
    return;
  } catch (error) {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: number }).status
        : undefined;
    if (status !== 404) {
      throw error;
    }
  }

  log.info(`[alerts-rag] creating space "${ALERTS_RAG_EMPTY_SPACE_ID}" (no alerts index)`);
  await fetch('/api/spaces/space', {
    method: 'POST',
    version: '2023-10-31',
    body: JSON.stringify({
      id: ALERTS_RAG_EMPTY_SPACE_ID,
      name: 'Alerts RAG Empty',
      description:
        'Eval-only space with no security alerts alias. Used to verify security.alerts space isolation.',
      disabledFeatures: [],
    }),
  });
};
