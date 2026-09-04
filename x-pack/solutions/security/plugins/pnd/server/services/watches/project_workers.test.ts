/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { PHASE_CATALOG, PHASE_IDS, SYSTEM_SECURITY_WATCH_IDS, WatchWorker } from '@kbn/pnd-common';
import { getManagedWorkflowDefinition, PND_WORKFLOW_TEMPLATE_VALUES } from '@kbn/workflows/managed';
import { parse } from 'yaml';

import {
  PND_INCIDENT_AGENT_ID,
  PND_INVESTIGATION_AGENT_ID,
  PND_TUNING_AGENT_ID,
} from '../../../common/constants';
import { PND_AGENTS } from '../../agent_builder/pnd_agents';
import { projectWorkers } from './project_workers';

/**
 * These tests read the real managed definitions rather than a fixture, which is the point: the
 * defect kibana-phf4.6 removes was a catalog that agreed with its own seed while disagreeing with
 * every lane that runs. A fixture would reproduce exactly that.
 */

const logger = loggingSystemMock.createLogger();

const workers = projectWorkers({ logger });

interface RawStep {
  name?: string;
  type?: string;
  'agent-id'?: string;
  else?: RawStep[];
  steps?: RawStep[];
}

const flatten = (steps: RawStep[] | undefined): RawStep[] =>
  (steps ?? []).flatMap((step) => [step, ...flatten(step.steps), ...flatten(step.else)]);

/** Every `ai.agent` step of every resumable watch, whether or not PND owns its agent. */
const agentSteps = SYSTEM_SECURITY_WATCH_IDS.flatMap((workflowId) => {
  const yaml = getManagedWorkflowDefinition(workflowId)?.yamlTemplate?.(
    PND_WORKFLOW_TEMPLATE_VALUES
  );

  return flatten((parse(yaml ?? '') as { steps?: RawStep[] } | null)?.steps).filter(
    ({ type }) => type === 'ai.agent'
  );
});

describe('projectWorkers', () => {
  it('projects at least one worker, so the page is not empty', () => {
    expect(workers.length).toBeGreaterThan(0);
  });

  it('parses every row through the WatchWorker contract', () => {
    expect(() => workers.forEach((worker) => WatchWorker.parse(worker))).not.toThrow();
  });

  it('names only steps a resumable watch really declares (AC1: nothing fictional)', () => {
    const declared = agentSteps.map(({ name }) => name);

    expect(workers.filter(({ id }) => !declared.includes(id))).toEqual([]);
  });

  it('names only agents PND installs (AC1: nothing fictional)', () => {
    const installed = PND_AGENTS.map(({ id }) => id);

    expect(workers.filter(({ agentId }) => !installed.includes(agentId))).toEqual([]);
  });

  it('attributes every row to a watch in the resume allow-list', () => {
    expect(
      workers.flatMap(({ watchIds }) =>
        watchIds.filter(
          (watchId) => !(SYSTEM_SECURITY_WATCH_IDS as readonly string[]).includes(watchId)
        )
      )
    ).toEqual([]);
  });

  it('gives every row at least one watch', () => {
    expect(workers.filter(({ watchIds }) => watchIds.length === 0)).toEqual([]);
  });

  it('carries the installed agent name rather than a humanized id', () => {
    expect(workers.map(({ agentName }) => agentName)).toEqual(
      workers.map(({ agentId }) => PND_AGENTS.find(({ id }) => id === agentId)?.name)
    );
  });

  it("carries the agent's skills verbatim from the agent definition", () => {
    expect(workers.map(({ skillIds }) => skillIds)).toEqual(
      workers.map(
        ({ agentId }) => PND_AGENTS.find(({ id }) => id === agentId)?.configuration.skill_ids ?? []
      )
    );
  });

  it('resolves every phase to a known lifecycle phase', () => {
    expect(workers.filter(({ phase }) => !PHASE_IDS.includes(phase))).toEqual([]);
  });

  it('never contradicts the phase catalog where a catalog row names the same step', () => {
    const catalogPhases = new Map(
      PHASE_CATALOG.flatMap(({ orchestratorStepId, phase }) =>
        orchestratorStepId == null ? [] : [[orchestratorStepId, phase] as const]
      )
    );

    expect(
      workers.filter(({ id, phase }) => catalogPhases.has(id) && catalogPhases.get(id) !== phase)
    ).toEqual([]);
  });

  it('emits one row per step name, so a step two lanes share is not duplicated', () => {
    expect(new Set(workers.map(({ id }) => id)).size).toBe(workers.length);
  });

  it('orders rows by id, so the table is stable across calls', () => {
    expect(workers.map(({ id }) => id)).toEqual([...workers.map(({ id }) => id)].sort());
  });

  /**
   * The Forensic Watch's `forensic_analysis` is the live example: it is a real `ai.agent` step, but it names
   * no `agent-id`, so at run time it falls through to the platform default agent. PND neither
   * installs nor configures that agent, so a row for it could state neither an agent nor its skills
   * truthfully — which is the whole class of row this bead removes.
   */
  it('skips an ai.agent step whose agent PND does not own', () => {
    const unowned = agentSteps.filter(({ 'agent-id': agentId }) => agentId == null);

    expect(workers.filter(({ id }) => unowned.some(({ name }) => name === id))).toEqual([]);
  });

  it('proves that skip is exercised, so the assertion above is not vacuous', () => {
    expect(agentSteps.filter(({ 'agent-id': agentId }) => agentId == null).length).toBeGreaterThan(
      0
    );
  });

  it('logs each skipped step rather than dropping it silently', () => {
    projectWorkers({ logger });

    expect(loggingSystemMock.collect(logger).debug.length).toBeGreaterThan(0);
  });

  /**
   * The complement of the skip, restated independently: a lane addresses its agent through one of
   * `derive_ids`' three agent-id outputs, so every step that reads one of those must appear. Written
   * as an id-set equality rather than a count so an added lane step fails here and is classified by
   * hand, the way `managed_workflow_drift.test.ts` treats a new installable workflow.
   */
  it('projects every ai.agent step that resolves an agent through derive_ids', () => {
    const owned = agentSteps.filter(({ 'agent-id': agentId }) =>
      /steps\.derive_ids\.output\.(incident|investigation|tuning)AgentId/.test(agentId ?? '')
    );

    expect(new Set(workers.map(({ id }) => id))).toEqual(new Set(owned.map(({ name }) => name)));
  });

  it.each([
    ['record_dismissed_investigation', PND_INVESTIGATION_AGENT_ID, 'investigation'],
    ['open_incident', PND_INCIDENT_AGENT_ID, 'incident_response'],
    ['record_containment_outcome', PND_INCIDENT_AGENT_ID, 'incident_response'],
    ['draft_tuning', PND_TUNING_AGENT_ID, 'post_incident'],
  ])('projects %s as %s in the %s phase', (id, agentId, phase) => {
    expect(workers.find((worker) => worker.id === id)).toEqual(
      expect.objectContaining({ agentId, phase })
    );
  });
});
