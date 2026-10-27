/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ActionsService } from '../services/actions/actions_service';
import type { HuntServices } from '../services/watches/hunt/types';
import {
  getTriageHeadroomStepDefinition,
  getTriageLoadAlertsStepDefinition,
  getTriagePlanSweepStepDefinition,
  getTriageRetagProposalAlertsStepDefinition,
  getTriageTagPatternKeysStepDefinition,
} from './alert_triage/alert_triage_steps';
import { getPackageReportStepDefinition } from './package_report';
import { getResolveProposalsStepDefinition } from './resolve_proposals';
import {
  getSummarizeInvestigationStepDefinition,
  type SummarizeInvestigationStepDependencies,
} from './summarize_investigation';
import type { PackageReportStepDependencies } from './package_report/package_report_step';
import { getTriageExcludeFromProposalStepDefinition } from './alert_triage/exclude_from_proposal_step';
import {
  getTriageGroupFpCandidatesStepDefinition,
  getTriageJoinProposalStepDefinition,
  type GroupProposalsStepDependencies,
} from './alert_triage/group_proposals_step';
import type { ReportWorkerOutcomeStepDeps } from './report_worker_outcome/report_worker_outcome_step';
import { getReportWorkerOutcomeStepDefinition } from './report_worker_outcome/report_worker_outcome_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  getActionsService,
  getConversations,
  resolveChatModel,
  getProposals,
  getHuntServices,
  getResolveHostEnrollment,
  isContextEngineEnabled,
  getInternalEsClient,
  getTaskManager,
  grouping,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getActionsService: () => ActionsService;
  getConversations: () => AgentBuilderPluginStart['conversations'];
  resolveChatModel: SummarizeInvestigationStepDependencies['resolveChatModel'];
  getProposals?: SummarizeInvestigationStepDependencies['getProposals'];
  getHuntServices: () => HuntServices;
  getResolveHostEnrollment?: PackageReportStepDependencies['getResolveHostEnrollment'];
  isContextEngineEnabled: PackageReportStepDependencies['isContextEngineEnabled'];
  getInternalEsClient?: () => ElasticsearchClient;
  getTaskManager: () => Pick<TaskManagerStartContract, 'aggregate'>;
  grouping: Omit<GroupProposalsStepDependencies, 'getConversations' | 'logger'>;
  logger?: Logger;
}) => {
  workflowsExtensions.registerStepDefinition(
    getPackageReportStepDefinition({
      getActionsService,
      getConversations,
      getHuntServices,
      getResolveHostEnrollment,
      isContextEngineEnabled,
      getInternalEsClient,
      logger,
    })
  );
  workflowsExtensions.registerStepDefinition(
    getResolveProposalsStepDefinition({
      getProposalsService: () => getHuntServices().getProposalsService(),
      getProposalPrivileges: () => getHuntServices().getProposalPrivileges(),
      getConversations,
      logger,
    })
  );
  workflowsExtensions.registerStepDefinition(
    getSummarizeInvestigationStepDefinition({
      getConversationClient: (request) => getConversations().getScopedClient({ request }),
      resolveChatModel,
      getProposals,
      logger,
    })
  );
  workflowsExtensions.registerStepDefinition(getTriageHeadroomStepDefinition({ getTaskManager }));
  workflowsExtensions.registerStepDefinition(getTriagePlanSweepStepDefinition());
  workflowsExtensions.registerStepDefinition(getTriageLoadAlertsStepDefinition());
  workflowsExtensions.registerStepDefinition(getTriageTagPatternKeysStepDefinition());
  workflowsExtensions.registerStepDefinition(getTriageRetagProposalAlertsStepDefinition());
  const groupingDeps = { ...grouping, getConversations, logger };
  workflowsExtensions.registerStepDefinition(
    getTriageGroupFpCandidatesStepDefinition(groupingDeps)
  );
  workflowsExtensions.registerStepDefinition(getTriageJoinProposalStepDefinition(groupingDeps));
  workflowsExtensions.registerStepDefinition(
    getTriageExcludeFromProposalStepDefinition({ getProposals: grouping.getProposals, logger })
  );
};

export { getPackageReportStepDefinition } from './package_report';
export { getResolveProposalsStepDefinition } from './resolve_proposals';

export { OPT_IN_TIMEOUT_MS as REPORT_STEP_OPT_IN_TIMEOUT_MS } from './report_worker_outcome/report_worker_outcome_step';

/** Registers the `alertzero.reportWorkerOutcome` step during plugin setup. */
export const registerAlertZeroStepDefinitions = ({
  workflowsExtensions,
  ...deps
}: ReportWorkerOutcomeStepDeps & {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}): void => {
  workflowsExtensions.registerStepDefinition(getReportWorkerOutcomeStepDefinition(deps));
};
