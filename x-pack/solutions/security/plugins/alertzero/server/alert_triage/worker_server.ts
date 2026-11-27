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
import { getTriageMatchFpDecisionsStepDefinition } from '../step_types/alert_triage/match_fp_decisions_step';
import { getTriageRevokeFpDecisionStepDefinition } from '../step_types/alert_triage/revoke_fp_decision_step';
import { getTriageStoreFpDecisionsStepDefinition } from '../step_types/alert_triage/store_fp_decisions_step';
import { toDecisionAutoCloseMode } from './constants';

/** Turns Alert Triage grouping off: every batch then mints its own proposal. */
export const TRIAGE_GROUPING_KILL_SWITCH: WorkerFeatureFlag<boolean> = {
  key: 'alertzero.triageGrouping',
  fallback: true,
};

/**
 * Decisions in the sweep. In `shadow` a matching alert is only tagged, and still goes through
 * analysis. In `on` an approved match is closed and a dismissed match is kept out of analysis.
 * In `off` decisions are neither stored nor matched. The default is `off` until the follow-ups that
 * `on` needs have landed, so `shadow` and `on` are set per deployment.
 */
export const TRIAGE_DECISION_AUTO_CLOSE: WorkerFeatureFlag<string> = {
  key: 'alertzero.triageDecisionAutoClose',
  fallback: 'off',
};

export const alertTriageServerDefinition: WorkerServerDefinition = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  featureFlags: [TRIAGE_GROUPING_KILL_SWITCH, TRIAGE_DECISION_AUTO_CLOSE],
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
    const decisionDeps = {
      isContextEngineEnabled: context.isContextEngineEnabled,
      getMode: async () =>
        toDecisionAutoCloseMode(context.getFeatureFlag(TRIAGE_DECISION_AUTO_CLOSE)),
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
      getTriageStoreFpDecisionsStepDefinition(decisionDeps),
      getTriageMatchFpDecisionsStepDefinition(decisionDeps),
      getTriageRevokeFpDecisionStepDefinition(),
    ];
  },
};
