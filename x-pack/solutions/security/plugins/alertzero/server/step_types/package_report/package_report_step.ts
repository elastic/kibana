/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  HUNT_COVERAGE_AI_INDEX_ID,
  packageReportStepCommonDefinition,
} from '../../../common/step_types/package_report';
import type { ActionsService } from '../../services/actions/actions_service';
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
   * Optional Context Engine gate. When false, every coverage subject is skipped
   * with reason `disabled` and proposals still mint.
   */
  isContextEngineEnabled?: (spaceId: string) => Promise<boolean>;
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
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
}): ((subjects: CoverageSubject[]) => Promise<CoverageWriteResult>) => {
  const backingIndex = `ai-index-idx-${HUNT_COVERAGE_AI_INDEX_ID}`;

  return async (subjects) => {
    const written: CoverageWriteResult['written'] = [];
    const skipped: CoverageWriteResult['skipped'] = [];

    if (!(await isContextEngineEnabled(spaceId))) {
      for (const subject of subjects) {
        skipped.push({ kiId: subject.kiId, subject: subject.subject, reason: 'disabled' });
      }
      return { written, skipped };
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
              subject: subject.subject,
              reason: 'already_processed',
            });
            continue;
          }
        } catch (error) {
          const code = readErrorStatusCode(error);
          if (code === 403) {
            skipped.push({ kiId: subject.kiId, subject: subject.subject, reason: 'denied' });
            continue;
          }
          if (code !== undefined && code !== 404) {
            skipped.push({
              kiId: subject.kiId,
              subject: subject.subject,
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
              subject: subject.subject,
              technique: subject.technique,
              report_id: subject.subject.split('|')[0],
              watch_id: 'hunt',
              producer: 'hunt.packageReport.v1',
              space_id: spaceId,
            },
          },
          refresh: 'wait_for',
        });
        written.push({ kiId: subject.kiId, subject: subject.subject });
      } catch (error) {
        const code = readErrorStatusCode(error);
        skipped.push({
          kiId: subject.kiId,
          subject: subject.subject,
          reason: code === 403 ? 'denied' : 'storage_failure',
        });
      }
    }

    return { written, skipped };
  };
};

const defaultRehydrateProcessSelectors: RunPackageReportDeps['rehydrateProcessSelectors'] =
  async () => [];

const defaultResolveHostEnrollment: RunPackageReportDeps['resolveHostEnrollment'] = async () => ({
  enrolled: false,
});

export const getPackageReportStepDefinition = ({
  getActionsService,
  getConversations,
  isContextEngineEnabled = async () => true,
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
            const listed = await getActionsService().list(sid, ['respond']);
            return { ok: true, actions: listed.actions };
          } catch {
            return { ok: false, reason: 'catalog_error' };
          }
        };

        const writeCoverageKis = createCoverageWriter({
          spaceId,
          getEsClient: () => context.contextManager.getScopedEsClient() as EsCoverageClient,
          isContextEngineEnabled,
        });

        const patchExpectedProposalCount: RunPackageReportDeps['patchExpectedProposalCount'] =
          async ({ conversationId, expectedProposalCount, runId }) => {
            await client.patchMetadata(conversationId, {
              'hunt.expectedProposalCount': expectedProposalCount,
              'hunt.expectedProposalCountRunId': runId,
            });
          };

        const output = await runPackageReport({
          spaceId,
          reportId: input.reportId,
          investigationConversationId: input.investigationConversationId,
          runId: input.runId,
          attachments: conversation.attachments,
          deps: {
            listRespondActions,
            writeCoverageKis,
            patchExpectedProposalCount,
            resolveHostEnrollment: defaultResolveHostEnrollment,
            rehydrateProcessSelectors: defaultRehydrateProcessSelectors,
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
