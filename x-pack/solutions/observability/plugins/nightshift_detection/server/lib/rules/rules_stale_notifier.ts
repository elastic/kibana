/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsClient } from '@kbn/workflows/server';
import { RULES_STALE_TRIGGER_ID, type RulesStaleEvent } from '../../../common/triggers/rules_stale';
import { getErrorMessage } from '../errors/get_error_message';

/** Tells the space of `request` that its detection rules are out of date. Never throws. */
export type NotifyRulesStale = (params: { request: KibanaRequest; event: RulesStaleEvent }) => void;

/**
 * Emits the rules stale trigger with the request that changed knowledge or sources, so the event
 * lands in its space and starts that space's rule reconcile workflow. Fire and forget: the write
 * that triggered it already committed, and the sources plugin awaits its listeners, so a slow or
 * failing emit must neither delay nor fail it. The workflow's schedule catches a lost event.
 */
export function createRulesStaleNotifier({
  getWorkflowsClient,
  logger,
}: {
  getWorkflowsClient: (request: KibanaRequest) => Promise<Pick<WorkflowsClient, 'emitEvent'>>;
  logger: Logger;
}): NotifyRulesStale {
  return ({ request, event }) => {
    void getWorkflowsClient(request)
      .then((client) => client.emitEvent(RULES_STALE_TRIGGER_ID, event))
      .catch((error) => {
        logger.warn(
          `Could not mark the detection rules out of date after a ${
            event.reason
          } change of sources [${event.source_ids.join(
            ', '
          )}]; the scheduled reconciliation catches up: ${getErrorMessage(error)}`
        );
      });
  };
}
