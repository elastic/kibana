/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ActionsService } from '../services/actions/actions_service';
import { getPackageReportStepDefinition } from './package_report';
import type { PackageReportStepDependencies } from './package_report/package_report_step';

export const registerStepDefinitions = ({
  workflowsExtensions,
  getActionsService,
  getConversations,
  getResolveHostEnrollment,
  isContextEngineEnabled,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getActionsService: () => ActionsService;
  getConversations: () => AgentBuilderPluginStart['conversations'];
  getResolveHostEnrollment?: PackageReportStepDependencies['getResolveHostEnrollment'];
  isContextEngineEnabled: PackageReportStepDependencies['isContextEngineEnabled'];
  logger?: Logger;
}) => {
  workflowsExtensions.registerStepDefinition(
    getPackageReportStepDefinition({
      getActionsService,
      getConversations,
      getResolveHostEnrollment,
      isContextEngineEnabled,
      logger,
    })
  );
};

export { getPackageReportStepDefinition } from './package_report';
