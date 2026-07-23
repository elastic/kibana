/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATIONS_URL } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import {
  buildProposalFromWorkerRun,
  buildEvidencePackageFromWorkerRun,
  buildWorkerEvaluationRecord,
  type SourceWatch,
} from '../../common/schemas';

const EMIT_PROPOSAL_PATH = `${PND_INVESTIGATIONS_URL}/_emit_proposal` as const;

const WorkerRunSchema = z
  .object({
    watch: z.string().optional(),
    classification: z.string().optional(),
    finding: z.string().optional(),
    confidence: z.number().min(0).max(1).default(0),
    rationale: z.string().optional(),
    recommendedAction: z.string().optional(),
    recommendedContainment: z.string().optional(),
    report: z.string().optional(),
    alertId: z.string().optional(),
    investigationId: z.string().default('unknown'),
    ruleName: z.string().optional(),
    severity: z.string().optional(),
    indicators: z.array(z.unknown()).optional(),
    modelId: z.string().optional(),
    connectorId: z.string().optional(),
    latencyMs: z.number().optional(),
  })
  .passthrough();

const EmitProposalRequestBody = z.object({
  sourceWatch: z.enum(['watch-floor', 'watch-officer', 'watch-dark', 'watch-deep']),
  draft: z.boolean().optional(),
  hilRequired: z.boolean().optional(),
  workerRun: WorkerRunSchema,
});

/**
 * Turn a Watch Worker run into the canonical Daybreak contract artifacts:
 * a Proposal, an EvidencePackage, and exactly one WorkerEvaluationRecord,
 * persisted to the PND indices the Throughline UI + E&T scorers read.
 *
 * Called by the Watch Orchestrator workflows (workflow.execute -> http step).
 * Fail-soft: partial ES write failures are logged and the endpoint returns 200
 * with whatever succeeded, because the orchestrator step is continue-on-failure.
 */
export const registerEmitProposalRoute = ({
  router,
  logger,
  config,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EMIT_PROPOSAL_PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Emit canonical Daybreak contract artifacts from a Watch Worker run',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: { body: buildRouteValidationWithZod(EmitProposalRequestBody) },
        },
      },
      async (context, request, response) => {
        const { sourceWatch, draft, workerRun } = request.body;
        const store = getInvestigationStore();

        // Derive a verdict from the worker output shape:
        // - Floor emits an explicit classification (true_positive / false_positive / inconclusive)
        // - Dark/Deep emit a finding; treat a high-confidence finding as a positive,
        //   otherwise flag it as needing evidence.
        const verdict =
          workerRun.classification ??
          (workerRun.confidence >= 0.5 ? 'true_positive' : 'needs_evidence');
        const summary =
          workerRun.rationale ?? workerRun.finding ?? workerRun.report ?? 'Watch worker run';
        const investigationId = workerRun.investigationId;
        const alertId = workerRun.alertId ?? investigationId;

        const proposal = buildProposalFromWorkerRun({
          id: uuidv4(),
          sourceWatch: sourceWatch as SourceWatch,
          investigationId,
          ruleName: workerRun.ruleName ?? `${sourceWatch} finding`,
          alertId,
          verdict,
          severity: workerRun.severity,
          confidence: workerRun.confidence,
          reasoning: summary,
          summary,
          draft: draft ?? false,
        });

        const evidence = buildEvidencePackageFromWorkerRun({
          id: uuidv4(),
          kind:
            sourceWatch === 'watch-deep'
              ? 'forensic'
              : sourceWatch === 'watch-dark'
              ? 'hunt'
              : 'alert',
          sourceRef: alertId,
          summary,
          confidence: workerRun.confidence,
          alertId,
        });

        const workerEval = buildWorkerEvaluationRecord({
          id: uuidv4(),
          watch: sourceWatch,
          investigationId,
          runId: uuidv4(),
          verdict,
          confidence: workerRun.confidence,
          proposalId: proposal.id,
          evidenceRefs: [evidence.id],
          provenance: {
            modelId: workerRun.modelId ?? 'unknown',
            connectorId: workerRun.connectorId ?? 'unknown',
            latencyMs: workerRun.latencyMs ?? 0,
            costBasis: 'unknown',
          },
        });

        // Link evidence to the proposal.
        proposal.evidenceRefs = [evidence.id];

        const written: string[] = [];
        if (store != null) {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          try {
            await store.saveEvidencePackage(esClient, evidence);
            written.push('evidence');
          } catch (error) {
            logger.warn(`PND: emit_proposal evidence write failed: ${error?.message}`);
          }
          try {
            await store.saveProposal(esClient, proposal);
            written.push('proposal');
          } catch (error) {
            logger.warn(`PND: emit_proposal proposal write failed: ${error?.message}`);
          }
          try {
            await store.saveWorkerEvaluationRecord(esClient, workerEval);
            written.push('workerEval');
          } catch (error) {
            logger.warn(`PND: emit_proposal worker-eval write failed: ${error?.message}`);
          }
        }

        return response.ok({
          body: {
            proposalId: proposal.id,
            evidenceId: evidence.id,
            workerEvalId: workerEval.id,
            status: proposal.status,
            written,
          },
        });
      }
    );
};
