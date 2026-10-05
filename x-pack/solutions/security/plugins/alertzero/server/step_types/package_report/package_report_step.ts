/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { packageReportStepCommonDefinition } from '../../../common/step_types/package_report';
import type { HuntServices } from '../../services/watches/hunt/types';
import { createExistingProposalsCounter } from '../../services/watches/hunt/packaging/check_existing_proposals';
import {
  PackageReportIdentityError,
  runPackageReport,
} from '../../services/watches/hunt/packaging/run_package_report';
import {
  createCoverageWriter,
  type EsCoverageClient,
} from '../../services/watches/hunt/packaging/write_coverage_kis';

export interface PackageReportStepDependencies {
  getConversations: () => AgentBuilderPluginStart['conversations'];
  /** For the existing-Proposals dedup guard; see `RunPackageReportDeps['countExistingProposals']`. */
  getHuntServices: () => HuntServices;
  /**
   * Context Engine gate. When false, every coverage subject is skipped with reason `disabled`
   * and proposals still mint. Required rather than defaulted: coverage KIs are written into the
   * Context Engine's own backing index, and its advanced setting ships off, so a missing gate
   * would have this step writing into a feature the deployment has not turned on. Takes the
   * request because the setting is space-scoped and resolved from the request's own space.
   */
  isContextEngineEnabled: (request: KibanaRequest) => Promise<boolean>;
  logger?: Logger;
}

/**
 * Workflow adapter for hunt packaging: validates the step input against the workflow's own
 * space, binds the request-scoped collaborators, and maps service errors onto engine errors.
 * Every packaging decision lives behind `runPackageReport` and the services it calls.
 */
export const getPackageReportStepDefinition = ({
  getConversations,
  getHuntServices,
  isContextEngineEnabled,
  logger,
}: PackageReportStepDependencies) =>
  createServerStepDefinition({
    ...packageReportStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = packageReportStepCommonDefinition.inputSchema.parse(context.input);
        const workflowContext = context.contextManager.getContext();
        const spaceId = workflowContext.workflow.spaceId;

        if (input.spaceId !== spaceId) {
          throw new ExecutionError({
            type: 'ConflictError',
            message: `spaceId input (${input.spaceId}) does not match workflow space (${spaceId})`,
          });
        }

        const request = context.contextManager.getFakeRequest();
        const conversations = getConversations();
        const client = await conversations.getScopedClient({ request });
        const conversation = await client.get(input.investigationConversationId);

        const writeCoverageKis = createCoverageWriter({
          spaceId,
          getEsClient: () => context.contextManager.getScopedEsClient() as EsCoverageClient,
          isContextEngineEnabled: () => isContextEngineEnabled(request),
        });

        const countExistingProposals = createExistingProposalsCounter({
          proposalsService: getHuntServices().getProposalsService(),
          spaceId,
          request,
          logger,
        });

        const output = await runPackageReport({
          spaceId,
          reportId: input.reportId,
          investigationConversationId: input.investigationConversationId,
          runId: input.runId,
          huntStatus: input.huntStatus,
          hasConfirmedHit: input.hasConfirmedHit,
          attachments: conversation.attachments,
          deps: {
            writeCoverageKis,
            countExistingProposals,
          },
        });

        return { output };
      } catch (error) {
        if (error instanceof PackageReportIdentityError) {
          throw new ExecutionError({ type: 'ConflictError', message: error.message });
        }
        if (error instanceof ExecutionError) {
          throw error;
        }
        throw new ExecutionError({
          type: 'ApiError',
          message: error instanceof Error ? error.message : 'Failed to package hunt report',
        });
      }
    },
  });
