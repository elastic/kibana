/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { packageReportStepCommonDefinition } from '../../../common/step_types/package_report';
import type { ActionsService } from '../../services/actions/actions_service';
import type { HuntServices } from '../../services/watches/hunt/types';
import { createOpenProposalChecker } from '../../services/watches/hunt/packaging/check_open_proposals';
import { createExistingProposalsCounter } from '../../services/watches/hunt/packaging/check_existing_proposals';
import { makeRehydrateProcessSelectors } from '../../services/watches/hunt/packaging/rehydrate_process_selectors';
import {
  PackageReportIdentityError,
  runPackageReport,
  type RunPackageReportDeps,
} from '../../services/watches/hunt/packaging/run_package_report';
import {
  createCoverageWriter,
  type EsCoverageClient,
} from '../../services/watches/hunt/packaging/write_coverage_kis';

export interface PackageReportStepDependencies {
  getActionsService: () => ActionsService;
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
  /**
   * Space-scoped per call: hostnames are not unique across spaces, so the Fleet lookup has to be
   * bound to the space the step runs in. Defaults to treating every host as unenrolled when not
   * provided (e.g. no Fleet plugin).
   */
  getResolveHostEnrollment?: (spaceId: string) => RunPackageReportDeps['resolveHostEnrollment'];
  /**
   * Defaults to the real `mget`-backed rehydrator built from the step's own scoped client, so
   * the calling user's privileges apply. Overridable for tests and Fleet-less deployments.
   */
  getRehydrateProcessSelectors?: (
    esClient: ElasticsearchClient,
    logger?: Logger
  ) => RunPackageReportDeps['rehydrateProcessSelectors'];
  /**
   * Kibana's internal-user ES client, for `loadReportHuntContext`'s read of
   * `.kibana-threat-reports`. The hunt worker's service-account role grants it no privilege on
   * that index at all (not even via an exact-name grant), so the step's own scoped client cannot
   * read it: a wildcard search there resolves to zero matched indices and returns an empty,
   * error-free result rather than a 403, which is indistinguishable from a genuinely missing
   * report. Optional so a caller without CoreStart wired up still packages (no enrichment).
   */
  getInternalEsClient?: () => ElasticsearchClient;
  logger?: Logger;
}

const defaultResolveHostEnrollment: RunPackageReportDeps['resolveHostEnrollment'] = async () => ({
  enrolled: false,
});

/**
 * Workflow adapter for hunt packaging: validates the step input against the workflow's own
 * space, binds the request-scoped collaborators, and maps service errors onto engine errors.
 * Every packaging decision lives behind `runPackageReport` and the services it calls.
 */
export const getPackageReportStepDefinition = ({
  getActionsService,
  getConversations,
  getHuntServices,
  isContextEngineEnabled,
  getResolveHostEnrollment = () => defaultResolveHostEnrollment,
  getRehydrateProcessSelectors = makeRehydrateProcessSelectors,
  getInternalEsClient,
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

        const listRespondActions: RunPackageReportDeps['listRespondActions'] = async (sid) => {
          try {
            const listed = await getActionsService().list(sid, request, ['respond']);
            return { ok: true, actions: listed.actions };
          } catch {
            return { ok: false, reason: 'catalog_error' };
          }
        };

        const writeCoverageKis = createCoverageWriter({
          spaceId,
          getEsClient: () => context.contextManager.getScopedEsClient() as EsCoverageClient,
          isContextEngineEnabled: () => isContextEngineEnabled(request),
        });

        const rehydrateProcessSelectors = getRehydrateProcessSelectors(
          context.contextManager.getScopedEsClient(),
          logger
        );

        const countExistingProposals = createExistingProposalsCounter({
          proposalsService: getHuntServices().getProposalsService(),
          spaceId,
          request,
          logger,
        });

        const hasOpenProposal = createOpenProposalChecker({
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
          expectedSseCount: input.expectedSseCount,
          coordinator: {
            reportIntentTargets: input.reportIntentTargets,
            behaviors: input.behaviors,
          },
          attachments: conversation.attachments,
          deps: {
            listRespondActions,
            writeCoverageKis,
            resolveHostEnrollment: getResolveHostEnrollment(spaceId),
            rehydrateProcessSelectors,
            countExistingProposals,
            getEsReportContextClient: getInternalEsClient,
            logger,
            hasOpenProposal,
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
