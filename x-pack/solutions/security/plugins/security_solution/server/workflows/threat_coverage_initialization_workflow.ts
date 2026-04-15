/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { THREAT_COVERAGE_INITIALIZATION_WORKFLOW_ID } from '../../common/constants';
import WORKFLOW_YAML from './threat_coverage_initialization_workflow.yaml';

export interface ThreatCoverageInitializationWorkflowService {
  ensureWorkflow(params: { enabled: boolean; request: KibanaRequest }): Promise<void>;
}

export const createThreatCoverageInitializationWorkflowService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management']
): ThreatCoverageInitializationWorkflowService => {
  const log = logger.get('threat-coverage-initialization-workflow');

  return {
    async ensureWorkflow({ enabled, request }) {
      const existing = await managementApi.getWorkflow(
        THREAT_COVERAGE_INITIALIZATION_WORKFLOW_ID,
        DEFAULT_SPACE_ID
      );
      const currentlyEnabled = existing?.enabled ?? false;
      const yamlChanged = existing != null && existing.yaml !== WORKFLOW_YAML;

      if (enabled === currentlyEnabled && !yamlChanged) {
        log.debug(() => `Workflow already ${enabled ? 'enabled' : 'disabled'}, no-op`);
        return;
      }

      if (existing) {
        const { deleted, failures } = await managementApi.deleteWorkflows(
          [THREAT_COVERAGE_INITIALIZATION_WORKFLOW_ID],
          DEFAULT_SPACE_ID,
          request,
          { force: true }
        );

        if (deleted === 0 && failures.length > 0) {
          const reasons = failures.map((f) => `${f.id}: ${f.error}`).join('; ');
          throw new Error(
            `Failed to delete workflow ${THREAT_COVERAGE_INITIALIZATION_WORKFLOW_ID}: ${reasons}`
          );
        }

        log.info(`Deleted workflow ${THREAT_COVERAGE_INITIALIZATION_WORKFLOW_ID}`);
      }

      if (!enabled) {
        return;
      }

      await managementApi.createWorkflow(
        { yaml: WORKFLOW_YAML, id: THREAT_COVERAGE_INITIALIZATION_WORKFLOW_ID },
        DEFAULT_SPACE_ID,
        request
      );

      log.info(
        `Created threat coverage initialization workflow ${THREAT_COVERAGE_INITIALIZATION_WORKFLOW_ID}`
      );
    },
  };
};
