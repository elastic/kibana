/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Projects the Workers catalog from the watch lanes that really run (kibana-phf4.6).
 *
 * A worker used to be a row of `WORKERS_SEED`: nine invented long-running services, each with a
 * global enablement flag, a seeded `lastRun` and a run-health state. None of it was true. Nothing
 * read the flag at execution time, so the switch on the settings page moved a number in an
 * in-memory store and the Watches carried on doing exactly what their YAML said.
 *
 * What is actually shared across watches, and actually orchestrated, is an `ai.agent` step. So a
 * worker is now one of those steps: its name is the orchestrator step name, its agent is the
 * Agent Builder agent the step names, and its skills are that agent's configured skills. Every
 * field traces to something a reader can go and look at.
 *
 * **Why the managed YAML rather than the live workflows.** The projection reads
 * `getManagedWorkflowDefinition`, not the Workflows management API. The definitions are what PND
 * installs, so they answer identically in mock and real mode, need no Elasticsearch round trip, and
 * — the point that matters for review — need no privilege beyond the read the route already
 * declares.
 *
 * **The honest limit.** A worker is now *described* truthfully, but it is still not a thing the
 * orchestrator dispatches *to*: the lane calls the agent inline, and nothing consults this catalog
 * before doing so. Making a worker dispatchable would mean changing lane step topology, which is
 * how the C12 reasoning-adjacency rule gets broken. See the register entry in the plugin README.
 */

import type { Logger } from '@kbn/core/server';
import { PHASE_CATALOG, SYSTEM_SECURITY_WATCH_IDS } from '@kbn/pnd-common';
import type { PhaseId, WatchWorker } from '@kbn/pnd-common';
import { getManagedWorkflowDefinition, PND_WORKFLOW_TEMPLATE_VALUES } from '@kbn/workflows/managed';
import { parse } from 'yaml';

import {
  PND_INCIDENT_AGENT_ID,
  PND_INVESTIGATION_AGENT_ID,
  PND_TUNING_AGENT_ID,
} from '../../../common/constants';
import { PND_AGENTS } from '../../agent_builder/pnd_agents';

/** The phase each agent serves, used when the step is not itself a phase catalog row. */
const PHASE_BY_AGENT_ID: Readonly<Record<string, PhaseId>> = {
  [PND_INCIDENT_AGENT_ID]: 'incident_response',
  [PND_INVESTIGATION_AGENT_ID]: 'investigation',
  [PND_TUNING_AGENT_ID]: 'post_incident',
};

/**
 * `derive_ids` output field name → the agent id it resolves to at run time, mirroring the ternary in
 * `derive_conversation_ids.ts`. Every lane addresses its agent through that step rather than naming
 * an id inline, so this table is what turns `{{ steps.derive_ids.output.tuningAgentId }}` back into
 * an agent PND installs.
 */
const AGENT_ID_BY_DERIVED_FIELD: Readonly<Record<string, string>> = {
  incidentAgentId: PND_INCIDENT_AGENT_ID,
  investigationAgentId: PND_INVESTIGATION_AGENT_ID,
  tuningAgentId: PND_TUNING_AGENT_ID,
};

/** Catalog rows win over the agent's phase where both speak, so a row and its worker agree. */
const PHASE_BY_STEP_NAME: Readonly<Record<string, PhaseId>> = Object.fromEntries(
  PHASE_CATALOG.flatMap(({ orchestratorStepId, phase }) =>
    orchestratorStepId == null ? [] : [[orchestratorStepId, phase] as const]
  )
);

const AGENT_BY_ID = new Map(PND_AGENTS.map((agent) => [agent.id, agent]));

const DERIVED_FIELD_RE = /steps\.derive_ids\.output\.(\w+)/;

interface ParsedStep {
  name?: string;
  type?: string;
  'agent-id'?: string;
  else?: ParsedStep[];
  steps?: ParsedStep[];
}

interface ParsedWorkflow {
  steps?: ParsedStep[];
}

/** Flattens a lane's step tree, including `if`/`else` bodies, which is where most lane steps live. */
const flattenSteps = (steps: readonly ParsedStep[] | undefined): ParsedStep[] =>
  (steps ?? []).flatMap((step) => [step, ...flattenSteps(step.steps), ...flattenSteps(step.else)]);

const parseLane = (workflowId: string): ParsedWorkflow => {
  const definition = getManagedWorkflowDefinition(workflowId);

  // Every PND definition is a template (decision 7) and ignores the values it is handed;
  // `PND_WORKFLOW_TEMPLATE_VALUES` exists because the platform refuses an install without them.
  return definition?.yamlTemplate == null
    ? {}
    : (parse(definition.yamlTemplate(PND_WORKFLOW_TEMPLATE_VALUES)) as ParsedWorkflow);
};

/**
 * Resolves the agent a step runs, or `undefined` when PND does not own it.
 *
 * `undefined` is the answer for a step that names no agent at all: it falls through to the platform
 * default agent, which PND neither installs nor configures, so projecting it would put a row on the
 * page whose agent and skills nobody here can account for.
 */
const resolveAgentId = (agentIdTemplate: string | undefined): string | undefined => {
  if (agentIdTemplate == null) return undefined;

  const derivedField = DERIVED_FIELD_RE.exec(agentIdTemplate)?.[1];
  const resolved =
    derivedField == null ? agentIdTemplate.trim() : AGENT_ID_BY_DERIVED_FIELD[derivedField];

  return resolved != null && AGENT_BY_ID.has(resolved) ? resolved : undefined;
};

interface ProjectedStep {
  agentId: string;
  stepName: string;
  watchId: string;
}

const projectLaneSteps = ({
  logger,
  workflowId,
}: {
  logger: Logger;
  workflowId: string;
}): ProjectedStep[] =>
  flattenSteps(parseLane(workflowId).steps).flatMap((step) => {
    if (step.type !== 'ai.agent' || step.name == null) return [];

    const agentId = resolveAgentId(step['agent-id']);

    if (agentId == null) {
      logger.debug(
        () =>
          `Not projecting "${step.name}" of watch "${workflowId}" as a worker: its agent-id "${
            step['agent-id'] ?? ''
          }" does not resolve to an agent PND installs`
      );
      return [];
    }

    return [{ agentId, stepName: step.name, watchId: workflowId }];
  });

/**
 * The Workers catalog: every `ai.agent` step of every resumable watch whose agent PND installs.
 *
 * Ordered by step name so the table is stable across calls, and deduped by step name so a step two
 * lanes share becomes one row carrying both watch ids rather than two rows that look like different
 * things.
 */
export const projectWorkers = ({ logger }: { logger: Logger }): WatchWorker[] => {
  const projected = SYSTEM_SECURITY_WATCH_IDS.flatMap((workflowId) =>
    projectLaneSteps({ logger, workflowId })
  );

  const watchIdsByStepName = projected.reduce<ReadonlyMap<string, readonly string[]>>(
    (accumulator, { stepName, watchId }) =>
      new Map(accumulator).set(stepName, [...(accumulator.get(stepName) ?? []), watchId]),
    new Map()
  );

  const agentIdByStepName = new Map(projected.map(({ agentId, stepName }) => [stepName, agentId]));

  return [...watchIdsByStepName.keys()].sort().flatMap((stepName) => {
    const agentId = agentIdByStepName.get(stepName);
    const agent = agentId == null ? undefined : AGENT_BY_ID.get(agentId);

    // Unreachable: `resolveAgentId` only answers with an id `AGENT_BY_ID` holds. Narrowing rather
    // than asserting, because a row with no agent is exactly the fiction this projection removes.
    if (agentId == null || agent == null) return [];

    return [
      {
        agentId,
        agentName: agent.name,
        id: stepName,
        phase: PHASE_BY_STEP_NAME[stepName] ?? PHASE_BY_AGENT_ID[agentId],
        skillIds: [...(agent.configuration.skill_ids ?? [])],
        watchIds: [...(watchIdsByStepName.get(stepName) ?? [])],
      },
    ];
  });
};
