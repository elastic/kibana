/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * What the two combined workflows reference has to exist in the step registry of every install
 * that gets them, whatever the feature flags say.
 *
 * The combined materialize workflow installs with Cortex or Memory, and the combined optimize
 * workflow now also carries the reinforcement phase, so both reference `nightshift.*` steps on
 * installs where the corresponding feature is off. If one of those steps were only registered
 * under its own flag, the install would resolve a step type the engine does not know. The check
 * runs against the YAML the definitions actually ship, and against the ids `plugin.ts` really
 * registers for each feature combination.
 */

import { parse } from 'yaml';
import { coreMock } from '@kbn/core/server/mocks';
import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import {
  getManagedWorkflowDefinition,
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { getDecisionTreeReinforcementAgentType } from '../server/agents/decision_tree_reinforcement';
import { getInvestigationAgentType } from '../server/agents/investigation';
import { NightshiftInvestigationsPlugin } from '../server/plugin';

const MANAGED_WORKFLOW_IDS = [
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
];

/** Step types the shipped YAMLs reference, minus the ones the engine implements itself. */
const referencedStepTypes = (workflowId: string): string[] => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed definition ${workflowId} has no yaml`);
  }
  const graph = convertToWorkflowGraph(parse(definition.yaml) as WorkflowYaml);
  const stepTypes = graph
    .nodes()
    .map((nodeId) => graph.node(nodeId))
    .filter((node) => node?.type === 'atomic')
    .map((node) => (node as { stepType: string }).stepType);
  // `ai.agent` is Agent Builder's, not this plugin's.
  return [...new Set(stepTypes.filter((stepType) => stepType.startsWith('nightshift.')))].sort();
};

const registeredStepIds = (flags: {
  cortexEnabled: boolean;
  memoryEnabled: boolean;
  decisionTreesEnabled: boolean;
}): string[] => {
  const registerStepDefinition = jest.fn();
  const plugin = new NightshiftInvestigationsPlugin(
    coreMock.createPluginInitializerContext({
      enabled: true,
      sandbox: { isAvailable: true },
      cortex: { enabled: flags.cortexEnabled },
      decision_trees: { enabled: flags.decisionTreesEnabled },
      memory: { enabled: flags.memoryEnabled },
    })
  );
  plugin.setup(coreMock.createSetup(), {
    share: { url: new MockUrlService() },
    taskManager: { registerTaskDefinitions: jest.fn() },
    workflowsManagement: {},
    workflowsExtensions: {
      registerManagedWorkflowOwner: jest.fn(),
      registerTriggerDefinition: jest.fn(),
      registerStepDefinition,
    },
    sandbox: { isAvailable: true },
  } as never);

  return registerStepDefinition.mock.calls.map(([definition]) => definition.id as string).sort();
};

const FEATURE_MATRIX = [
  { name: 'cortex only', cortexEnabled: true, memoryEnabled: false, decisionTreesEnabled: false },
  { name: 'memory only', cortexEnabled: false, memoryEnabled: true, decisionTreesEnabled: false },
  {
    name: 'cortex, memory and trees',
    cortexEnabled: true,
    memoryEnabled: true,
    decisionTreesEnabled: true,
  },
];

describe('combined workflows only reference registered step types', () => {
  // The combined workflows install whenever Cortex or Memory is on, whatever the tree flag, so
  // these are exactly the installs that can resolve them.
  it.each(FEATURE_MATRIX)('with $name', ({ ...flags }) => {
    const registered = registeredStepIds(flags);

    for (const workflowId of MANAGED_WORKFLOW_IDS) {
      const referenced = referencedStepTypes(workflowId);
      expect(referenced.length).toBeGreaterThan(0);
      expect(referenced.filter((stepType) => !registered.includes(stepType))).toEqual([]);
    }
  });
});

describe('agent hooks around the combined workflows', () => {
  // Two pre-hooks would hydrate the trees twice into two conversations; two post-hooks would
  // reinforce every round twice, at up to 900s each.
  it('gives the investigator exactly one pre-hook and one post-hook', () => {
    const base = getInvestigationAgentType({
      sandboxEnabled: true,
      cortexEnabled: true,
      memoryEnabled: true,
      decisionTreesEnabled: true,
    }).baseConfiguration;

    expect(typeof base === 'function' ? [] : base.workflow_ids).toEqual([
      NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
    ]);
    expect(typeof base === 'function' ? [] : base.post_execution_workflow_ids).toEqual([
      NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
    ]);
  });

  // The reinforcement agent runs in its own conversation, whose workspace is namespaced
  // separately, so it keeps the dedicated hydrate workflow. It must not run the investigator's
  // post-execution hook: that hook would launch another reinforcement agent.
  it('gives the reinforcement agent its own hydrate hook and no post-hook', () => {
    const base = getDecisionTreeReinforcementAgentType().baseConfiguration;

    expect(typeof base === 'function' ? [] : base.workflow_ids).toEqual([
      NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
    ]);
    expect(typeof base === 'function' ? [] : base.post_execution_workflow_ids).toBeUndefined();
  });
});
