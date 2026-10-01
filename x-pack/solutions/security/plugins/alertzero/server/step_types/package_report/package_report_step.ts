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
import {
  HUNT_COVERAGE_AI_INDEX_ID,
  packageReportStepCommonDefinition,
} from '../../../common/step_types/package_report';
import type { ActionsService } from '../../services/actions/actions_service';
import { buildCoverageSubject } from './coverage_ki_id';
import { makeRehydrateProcessSelectors } from './rehydrate_process_selectors';
import {
  PackageReportIdentityError,
  runPackageReport,
  type RunPackageReportDeps,
} from './run_package_report';
import type { CoverageSubject, CoverageWriteResult } from './types';

export interface PackageReportStepDependencies {
  getActionsService: () => ActionsService;
  getConversations: () => AgentBuilderPluginStart['conversations'];
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
  logger?: Logger;
}

interface EsCoverageClient {
  get: (params: {
    index: string;
    id: string;
  }) => Promise<{ _source?: { attributes?: { status?: string } } }>;
  index: (params: {
    index: string;
    id: string;
    document: Record<string, unknown>;
    refresh: 'wait_for';
  }) => Promise<unknown>;
}

const readErrorStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
    return (error as { statusCode: number }).statusCode;
  }
  if (
    'meta' in error &&
    typeof (error as { meta?: { statusCode?: unknown } }).meta?.statusCode === 'number'
  ) {
    return (error as { meta: { statusCode: number } }).meta.statusCode;
  }
  return undefined;
};

/**
 * Writes coverage KIs via the scoped ES client. No-reset: an existing KI whose
 * attributes.status is not `pending` is skipped (`already_processed`) rather than
 * rewritten. Disabled / denied / storage failures are distinct skip reasons.
 */
export const createCoverageWriter = ({
  spaceId,
  getEsClient,
  isContextEngineEnabled,
}: {
  spaceId: string;
  getEsClient: () => EsCoverageClient;
  /** Already bound to this run's request by the caller; see the step's own dependency. */
  isContextEngineEnabled: () => Promise<boolean>;
}): ((subjects: CoverageSubject[]) => Promise<CoverageWriteResult>) => {
  const backingIndex = `ai-index-idx-${HUNT_COVERAGE_AI_INDEX_ID}`;

  return async (subjects) => {
    const written: CoverageWriteResult['written'] = [];
    const skipped: CoverageWriteResult['skipped'] = [];

    const subjectLabel = (subject: CoverageSubject) =>
      buildCoverageSubject({ reportId: subject.reportId, techniqueId: subject.technique });

    const skipEvery = (reason: CoverageWriteResult['skipped'][number]['reason']) => {
      for (const subject of subjects) {
        skipped.push({ kiId: subject.kiId, subject: subjectLabel(subject), reason });
      }
      return { written, skipped };
    };

    // Reading the gate goes through the saved objects client, so it can fail on its own.
    // That must not sink the run: minting proposals does not depend on the Context Engine,
    // and this gate exists to protect the Context Engine's index, not to decide whether a
    // confirmed hit reaches an analyst. An unreadable setting is also not a disabled one --
    // the deployment's intent is unknown, which is reason enough not to write, but not
    // reason to claim the feature is off.
    let contextEngineEnabled: boolean;
    try {
      contextEngineEnabled = await isContextEngineEnabled();
    } catch {
      return skipEvery('storage_failure');
    }

    if (!contextEngineEnabled) {
      return skipEvery('disabled');
    }

    const esClient = getEsClient();

    for (const subject of subjects) {
      try {
        try {
          const existing = await esClient.get({ index: backingIndex, id: subject.kiId });
          const status = existing._source?.attributes?.status;
          if (status !== undefined && status !== 'pending') {
            skipped.push({
              kiId: subject.kiId,
              subject: subjectLabel(subject),
              reason: 'already_processed',
            });
            continue;
          }
        } catch (error) {
          const code = readErrorStatusCode(error);
          if (code === 403) {
            skipped.push({ kiId: subject.kiId, subject: subjectLabel(subject), reason: 'denied' });
            continue;
          }
          // Only a 404 licenses the write below: it is the one answer that says the item is
          // not there. Anything else -- including an error carrying no status code at all,
          // such as a connection reset or a timeout -- leaves the current status unknown, and
          // falling through would index `status: pending` over an item that may already have
          // been processed, which is the no-reset rule this function promises.
          if (code !== 404) {
            skipped.push({
              kiId: subject.kiId,
              subject: subjectLabel(subject),
              reason: 'storage_failure',
            });
            continue;
          }
        }

        const now = new Date().toISOString();
        await esClient.index({
          index: backingIndex,
          id: subject.kiId,
          document: {
            '@timestamp': now,
            id: subject.kiId,
            updated_at: now,
            type: 'security.coverage',
            title: subject.title,
            description: subject.description,
            content: subject.content,
            tags: ['consumer:detection', 'status:pending', 'watch:hunt'],
            attributes: {
              status: 'pending',
              technique: subject.technique,
              report_id: subject.reportId,
              investigation_id: subject.investigationConversationId,
              watch_id: 'hunt',
              producer: 'hunt.packageReport.v1',
              space_id: spaceId,
            },
          },
          refresh: 'wait_for',
        });
        written.push({ kiId: subject.kiId, subject: subjectLabel(subject) });
      } catch (error) {
        const code = readErrorStatusCode(error);
        skipped.push({
          kiId: subject.kiId,
          subject: subjectLabel(subject),
          reason: code === 403 ? 'denied' : 'storage_failure',
        });
      }
    }

    return { written, skipped };
  };
};

const defaultResolveHostEnrollment: RunPackageReportDeps['resolveHostEnrollment'] = async () => ({
  enrolled: false,
});

export const getPackageReportStepDefinition = ({
  getActionsService,
  getConversations,
  isContextEngineEnabled,
  getResolveHostEnrollment = () => defaultResolveHostEnrollment,
  getRehydrateProcessSelectors = makeRehydrateProcessSelectors,
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

        const output = await runPackageReport({
          spaceId,
          reportId: input.reportId,
          investigationConversationId: input.investigationConversationId,
          runId: input.runId,
          huntStatus: input.huntStatus,
          hasConfirmedHit: input.hasConfirmedHit,
          attachments: conversation.attachments,
          deps: {
            listRespondActions,
            writeCoverageKis,
            resolveHostEnrollment: getResolveHostEnrollment(spaceId),
            rehydrateProcessSelectors,
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
