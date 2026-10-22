/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type {
  EngineEvent,
  LabelledIncident,
  LearningOverviewResponse,
  LearningRunSummary,
  MemoryNote,
  StrategyCandidate,
} from '../../common';
import { DETECTION_ENGINE_API_BASE_PATH } from '../../common';
import type { IEngineScope } from '../lib/engine/engine_scope';
import { DetectionEngineError } from '../lib/errors';
import { advance, listCandidates, saveCandidate } from '../lib/learning/candidates';
import { detectorId, validateCondition } from '../lib/learning/detector_author';
import { labelMissed, listIncidents } from '../lib/learning/incidents';
import { goLive, runLearning } from '../lib/learning/learning_loop';
import { createMemory } from '../lib/learning/memory';
import { proposeFromPerson } from '../lib/learning/propose';
import { createRunKnowledge } from '../lib/engine/knowledge';
import { proposeKiChanges } from '../lib/learning/ki_quality';
import { confirmEvent } from '../lib/operator/operator_actions';
import { LONG_RUN_IDLE_SOCKET_MS, abortSignalOf, createRoute } from './create_route';

const READ = { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } };
const MANAGE = { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } };
const idPath = z.object({ id: z.string().min(1).max(255) });

async function loadCandidate(scope: IEngineScope, id: string): Promise<StrategyCandidate> {
  const candidate = await scope.storage.state.get('candidate', id);
  if (!candidate) {
    throw new DetectionEngineError(`Candidate ${id} not found`, 404);
  }
  return candidate;
}

/** Records a person's decision on a candidate in the activity log, like every learned change. */
async function logDecision(scope: IEngineScope, candidate: StrategyCandidate): Promise<void> {
  const last = candidate.history[candidate.history.length - 1];
  await scope.storage.records.appendActivity([
    {
      '@timestamp': last.at,
      step: 'learning',
      action: `candidate_${candidate.stage}`,
      strategy: candidate.scope.strategy,
      service: candidate.scope.service,
      message: `"${candidate.title}": ${last.note}`,
      details: { candidate_id: candidate.candidate_id, by: 'person' },
    },
  ]);
}

const learningRoute = createRoute({
  endpoint: `GET ${DETECTION_ENGINE_API_BASE_PATH}/learning`,
  options: { access: 'internal', summary: 'What the learning loop knows and is doing' },
  security: READ,
  params: z.object({}),
  handler: async ({ request, getStartServices }): Promise<LearningOverviewResponse> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const { storage } = scope;
    const sources = await scope.listSources();
    const [config, lastRun, candidates, incidents, memory, kiProposals] = await Promise.all([
      storage.getConfig(),
      storage.state.get('learning_run'),
      listCandidates(storage.state),
      listIncidents(storage.state),
      createMemory(storage.state).list(),
      createRunKnowledge({ scope, sources })
        .getQueryLinks()
        .then((links) => proposeKiChanges({ records: storage.records, links }))
        // Without readable KIs there is nothing to propose about them.
        .catch(() => []),
    ]);
    return {
      config: config.learning,
      last_run: lastRun,
      candidates,
      incidents,
      memory,
      ki_proposals: kiProposals,
    };
  },
});

const learnRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/learning/_run`,
  options: {
    access: 'internal',
    summary: 'Run one learning pass now',
    timeout: { idleSocket: LONG_RUN_IDLE_SOCKET_MS },
  },
  security: MANAGE,
  params: z.object({}),
  handler: async ({ request, getStartServices }): Promise<LearningRunSummary> => {
    const { createScope } = await getStartServices();
    return runLearning(await createScope(request), {
      trigger: 'manual',
      signal: abortSignalOf(request),
    });
  },
});

const confirmRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/events/{id}/_confirm`,
  options: { access: 'internal', summary: 'Confirm an event was a real problem' },
  security: MANAGE,
  params: z.object({
    path: idPath,
    body: z
      .object({
        note: z.string().max(2_000).optional(),
        /** 1-based; the current episode when absent. */
        episode: z.number().int().min(1).optional(),
      })
      .nullish(),
  }),
  handler: async ({ request, params, getStartServices }): Promise<EngineEvent> => {
    const { createScope } = await getStartServices();
    return confirmEvent({
      scope: await createScope(request),
      eventId: params.path.id,
      note: params.body?.note,
      episode: params.body?.episode,
    });
  },
});

const reportMissedRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/incidents`,
  options: { access: 'internal', summary: 'Report a problem the engine missed' },
  security: MANAGE,
  params: z.object({
    body: z.object({
      services: z.array(z.string().min(1).max(255)).min(1).max(20),
      from: isoDateTime(),
      to: isoDateTime().optional(),
      description: z.string().min(1).max(2_000),
    }),
  }),
  handler: async ({ request, params, getStartServices }): Promise<LabelledIncident> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const incident = await labelMissed({ state: scope.storage.state, ...params.body });
    await scope.storage.records.appendActivity([
      {
        '@timestamp': incident.created_at,
        step: 'learning',
        action: 'missed_reported',
        service: incident.services[0],
        message: `A person reported a missed incident on ${incident.services.join(', ')} from ${
          incident.from
        }: "${incident.description}". The next learning pass looks for what would have caught it.`,
        details: { incident_id: incident.incident_id },
      },
    ]);
    return incident;
  },
});

const deleteIncidentRoute = createRoute({
  endpoint: `DELETE ${DETECTION_ENGINE_API_BASE_PATH}/incidents/{id}`,
  options: { access: 'internal', summary: 'Remove a labelled incident' },
  security: MANAGE,
  params: z.object({ path: idPath }),
  handler: async ({ request, params, getStartServices }): Promise<{ deleted: true }> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    await scope.storage.state.delete('incident', { key: params.path.id });
    await scope.storage.records.appendActivity([
      {
        '@timestamp': new Date().toISOString(),
        step: 'learning',
        action: 'label_removed',
        message: `A person removed labelled incident ${params.path.id}.`,
      },
    ]);
    return { deleted: true };
  },
});

const createCandidateRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/candidates`,
  options: {
    access: 'internal',
    summary: 'Propose a detector; it takes the same path as the engine’s own',
  },
  security: MANAGE,
  params: z.object({
    body: z.object({
      service: z.string().min(1).max(255),
      source_id: z.string().min(1).max(255),
      condition: z.string().min(1).max(4_000),
      title: z.string().min(1).max(255),
      description: z.string().max(2_000).default(''),
      importance: z.number().min(0).max(100).default(60),
      must_catch: z.array(z.string()).max(50).default([]),
    }),
  }),
  handler: async ({ request, params, getStartServices }): Promise<StrategyCandidate> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const { body } = params;
    const source = (await scope.listSources()).find((item) => item.id === body.source_id);
    if (!source) {
      throw new DetectionEngineError(`Source ${body.source_id} is not enabled`, 400);
    }
    const invalid = await validateCondition({
      esClient: scope.dataEsClient,
      source,
      condition: body.condition,
      signal: abortSignalOf(request),
    });
    if (invalid) {
      throw new DetectionEngineError(`The condition does not run: ${invalid}`, 400);
    }
    const candidate = proposeFromPerson({
      config: await scope.storage.getConfig(),
      detector: {
        detector_id: detectorId(source.id, body.service, body.condition),
        title: body.title,
        description: body.description,
        service: body.service,
        source_id: source.id,
        condition: body.condition,
        importance: body.importance,
      },
      mustCatch: body.must_catch,
    });
    await saveCandidate(scope.storage.state, candidate);
    await logDecision(scope, candidate);
    return candidate;
  },
});

const approveRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/candidates/{id}/_approve`,
  options: { access: 'internal', summary: 'Approve a candidate that passed its trial' },
  security: MANAGE,
  params: z.object({ path: idPath }),
  handler: async ({ request, params, getStartServices }): Promise<StrategyCandidate> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const candidate = await loadCandidate(scope, params.path.id);
    if (candidate.stage !== 'review') {
      throw new DetectionEngineError(
        `Only a candidate waiting for review can be approved; this one is ${candidate.stage}`,
        409
      );
    }
    const next = goLive(candidate, 'Approved by a person; live with its daily cap.', 'person');
    await saveCandidate(scope.storage.state, next);
    await logDecision(scope, next);
    return next;
  },
});

const rejectRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/candidates/{id}/_reject`,
  options: { access: 'internal', summary: 'Reject a candidate, or roll back a live one' },
  security: MANAGE,
  params: z.object({
    path: idPath,
    body: z.object({ reason: z.string().max(2_000).optional() }).nullish(),
  }),
  handler: async ({ request, params, getStartServices }): Promise<StrategyCandidate> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const candidate = await loadCandidate(scope, params.path.id);
    const reason = params.body?.reason ? `: ${params.body.reason}` : '.';
    const next =
      candidate.stage === 'live' || candidate.stage === 'kept'
        ? advance(candidate, 'rolled_back', `Rolled back by a person${reason}`, 'person')
        : advance(candidate, 'rejected', `Rejected by a person${reason}`, 'person');
    await saveCandidate(scope.storage.state, next);
    await logDecision(scope, next);
    return next;
  },
});

const retireNoteRoute = createRoute({
  endpoint: `POST ${DETECTION_ENGINE_API_BASE_PATH}/memory/{id}/_retire`,
  options: { access: 'internal', summary: 'Retire a memory note the agent should no longer read' },
  security: MANAGE,
  params: z.object({
    path: idPath,
    body: z.object({ reason: z.string().min(1).max(2_000) }),
  }),
  handler: async ({ request, params, getStartServices }): Promise<MemoryNote> => {
    const { createScope } = await getStartServices();
    const scope = await createScope(request);
    const note = await createMemory(scope.storage.state).retire({
      noteId: params.path.id,
      reason: params.body.reason,
    });
    if (!note) {
      throw new DetectionEngineError(`Memory note ${params.path.id} not found`, 404);
    }
    await scope.storage.records.appendActivity([
      {
        '@timestamp': note.retired_at!,
        step: 'learning',
        action: 'memory_retired',
        message: `A person retired the memory note "${note.text}": ${params.body.reason}`,
      },
    ]);
    return note;
  },
});

export const learningRoutes = {
  ...learningRoute,
  ...learnRoute,
  ...confirmRoute,
  ...reportMissedRoute,
  ...deleteIncidentRoute,
  ...createCandidateRoute,
  ...approveRoute,
  ...rejectRoute,
  ...retireNoteRoute,
};
