/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import {
  WORKER_SERVER_DEFINITIONS,
  type WorkerServerContext,
  type WorkerServerDefinition,
} from '../workers';
import { getResolveProposalsStepDefinition } from './resolve_proposals';
import {
  getSummarizeInvestigationStepDefinition,
  type SummarizeInvestigationStepDependencies,
} from './summarize_investigation';
import type { ReportWorkerOutcomeStepDeps } from './report_worker_outcome/report_worker_outcome_step';
import { getReportWorkerOutcomeStepDefinition } from './report_worker_outcome/report_worker_outcome_step';

/** Registers the shared steps, then every step each Worker declares. */
export const registerStepDefinitions = ({
  workflowsExtensions,
  context,
  resolveChatModel,
  readProposals,
  workers = WORKER_SERVER_DEFINITIONS,
}: {
  workflowsExtensions: Pick<WorkflowsExtensionsServerPluginSetup, 'registerStepDefinition'>;
  context: WorkerServerContext;
  resolveChatModel: SummarizeInvestigationStepDependencies['resolveChatModel'];
  readProposals: NonNullable<SummarizeInvestigationStepDependencies['readProposals']>;
  workers?: readonly WorkerServerDefinition[];
}): void => {
  const { assertStarted, getConversations, getProposalsPlugin, logger } = context;
  workflowsExtensions.registerStepDefinition(
    getResolveProposalsStepDefinition({
      getProposalsService: () => {
        assertStarted();
        return getProposalsPlugin().getProposalsService();
      },
      getProposalPrivileges: () => {
        assertStarted();
        return getProposalsPlugin().getProposalPrivileges();
      },
      getConversations,
      logger,
    })
  );
  workflowsExtensions.registerStepDefinition(
    getSummarizeInvestigationStepDefinition({
      getConversationClient: (request) => getConversations().getScopedClient({ request }),
      resolveChatModel,
      readProposals,
      logger,
    })
  );
  for (const worker of workers) {
    for (const definition of worker.getStepDefinitions?.(context) ?? []) {
      workflowsExtensions.registerStepDefinition(definition);
    }
  }
};

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
