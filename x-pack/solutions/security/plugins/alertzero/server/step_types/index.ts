/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ActionsService } from '../services/actions/actions_service';
import { getPackageReportStepDefinition } from './package_report';
import { getFindOrCreateInvestigationStepDefinition } from './find_or_create_investigation';

export const registerStepDefinitions = ({
  workflowsExtensions,
  getActionsService,
  getConversations,
  isContextEngineEnabled,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getActionsService: () => ActionsService;
  getConversations: () => AgentBuilderPluginStart['conversations'];
  isContextEngineEnabled?: (spaceId: string) => Promise<boolean>;
}) => {
  workflowsExtensions.registerStepDefinition(
    getPackageReportStepDefinition({
      getActionsService,
      getConversations,
      isContextEngineEnabled,
    })
  );
  workflowsExtensions.registerStepDefinition(
    getFindOrCreateInvestigationStepDefinition({ getConversations })
  );
};

export { getPackageReportStepDefinition } from './package_report';
export { getFindOrCreateInvestigationStepDefinition } from './find_or_create_investigation';
