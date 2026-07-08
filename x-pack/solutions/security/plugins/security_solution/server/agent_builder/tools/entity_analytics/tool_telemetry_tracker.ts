/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../lib/telemetry/event_based/events';

/**
 * Tracks the outcome of a single Entity Analytics agent builder tool invocation and
 * reports it to `ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT` telemetry event.
 */
export const createToolTelemetryTracker = ({
  core,
  toolId,
  spaceId,
  actionType,
  entityTypes,
}: {
  core: SecuritySolutionPluginCoreSetupDependencies;
  toolId: string;
  spaceId: string;
  actionType: 'read' | 'mutation';
  entityTypes?: string[];
}) => {
  let success = true;
  let errorMessage: string | undefined;
  let userConfirmationOutcome: ConfirmationStatus | undefined;
  let resultCount: number | undefined;
  let awaitingConfirmation = false;

  return {
    recordConfirmationStatus: (status: ConfirmationStatus) => {
      userConfirmationOutcome = status;
    },
    recordAwaitingConfirmation: () => {
      awaitingConfirmation = true;
    },
    recordFailure: (message: string) => {
      success = false;
      errorMessage = message;
    },
    recordResultCount: (count: number) => {
      resultCount = count;
    },
    report: async () => {
      if (awaitingConfirmation) {
        return;
      }
      const [coreStart] = await core.getStartServices();
      coreStart.analytics.reportEvent(ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType, {
        toolId,
        actionType,
        entityTypes,
        spaceId,
        success,
        resultCount,
        errorMessage,
        userConfirmationOutcome,
      });
    },
  };
};
