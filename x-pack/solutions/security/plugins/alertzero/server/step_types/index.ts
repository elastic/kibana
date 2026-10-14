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
} from './alert_triage/alert_triage_steps';
import { getPackageReportStepDefinition } from './package_report';
import {
  getSummarizeInvestigationStepDefinition,
  type SummarizeInvestigationStepDependencies,
} from './summarize_investigation';
import type { PackageReportStepDependencies } from './package_report/package_report_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  getActionsService,
  getConversations,
  getExecution,
  resolveConnectorId,
  getHuntServices,
  getResolveHostEnrollment,
  isContextEngineEnabled,
  getInternalEsClient,
  getTaskManager,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getActionsService: () => ActionsService;
  getConversations: () => AgentBuilderPluginStart['conversations'];
  getExecution: SummarizeInvestigationStepDependencies['executeAgent'];
  resolveConnectorId?: SummarizeInvestigationStepDependencies['resolveConnectorId'];
  getHuntServices: () => HuntServices;
  getResolveHostEnrollment?: PackageReportStepDependencies['getResolveHostEnrollment'];
  isContextEngineEnabled: PackageReportStepDependencies['isContextEngineEnabled'];
  getInternalEsClient?: () => ElasticsearchClient;
  getTaskManager: () => Pick<TaskManagerStartContract, 'aggregate'>;
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
    getSummarizeInvestigationStepDefinition({
      getConversationClient: (request) => getConversations().getScopedClient({ request }),
      executeAgent: (params) => getExecution(params),
      resolveConnectorId,
    })
  );
  workflowsExtensions.registerStepDefinition(getTriageHeadroomStepDefinition({ getTaskManager }));
  workflowsExtensions.registerStepDefinition(getTriagePlanSweepStepDefinition());
  workflowsExtensions.registerStepDefinition(getTriageLoadAlertsStepDefinition());
};

export { getPackageReportStepDefinition } from './package_report';
