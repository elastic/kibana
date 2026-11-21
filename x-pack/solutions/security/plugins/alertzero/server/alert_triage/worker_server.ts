/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID } from '@kbn/alertzero-common';
import type { WorkerFeatureFlag, WorkerServerDefinition } from '../workers/types';
import {
  getTriageHeadroomStepDefinition,
  getTriageLoadAlertsStepDefinition,
  getTriagePlanSweepStepDefinition,
  getTriageRetagProposalAlertsStepDefinition,
  getTriageTagPatternKeysStepDefinition,
} from '../step_types/alert_triage/alert_triage_steps';
import {
  getTriageGroupFpCandidatesStepDefinition,
  getTriageJoinProposalStepDefinition,
  type GroupProposalsStepDependencies,
} from '../step_types/alert_triage/group_proposals_step';

/** Turns Alert Triage grouping off: every batch then mints its own proposal. */
export const TRIAGE_GROUPING_KILL_SWITCH: WorkerFeatureFlag<boolean> = {
  key: 'alertzero.triageGrouping',
  fallback: true,
};

export const alertTriageServerDefinition: WorkerServerDefinition = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  featureFlags: [TRIAGE_GROUPING_KILL_SWITCH],
  getStepDefinitions: (context) => {
    const { getConversations, getProposalsPlugin, getTaskManager, getWorkflowsManagement, logger } =
      context;
    const groupingDeps: GroupProposalsStepDependencies = {
      getProposalsPlugin,
      getWorkflowsManagement,
      getConversations,
      isGroupingEnabled: async () => context.getFeatureFlag(TRIAGE_GROUPING_KILL_SWITCH),
      logger,
    };
    const requireWorkflowsManagement = () => {
      const management = getWorkflowsManagement();
      if (!management) {
        throw new Error('Workflows management is not available');
      }
      return management;
    };
    return [
      getTriageHeadroomStepDefinition({ getTaskManager }),
      getTriagePlanSweepStepDefinition(),
      getTriageLoadAlertsStepDefinition({ getWorkflowsManagement: requireWorkflowsManagement }),
      getTriageTagPatternKeysStepDefinition(),
      getTriageRetagProposalAlertsStepDefinition(),
      getTriageGroupFpCandidatesStepDefinition(groupingDeps),
      getTriageJoinProposalStepDefinition(groupingDeps),
    ];
  },
};
