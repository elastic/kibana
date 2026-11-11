/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
  NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
  NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID,
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installStaticWorkflows } from './install_static_workflows';

const ALWAYS = [
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID,
  NIGHTSHIFT_ONBOARDING_SUGGESTIONS_WORKFLOW_ID,
];
const KNOWLEDGE = [
  NIGHTSHIFT_SANDBOX_MATERIALIZE_WORKSPACE_WORKFLOW_ID,
  NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID,
];

const createClient = () => {
  const installMany = jest.fn().mockResolvedValue({ failed: [] });
  const ready = jest.fn().mockResolvedValue(undefined);
  return {
    installMany,
    ready,
    client: { installMany, ready } as unknown as PluginScopedManagedWorkflowsApi,
  };
};

describe('installStaticWorkflows', () => {
  it.each([
    [false, false, ALWAYS],
    [true, false, [...ALWAYS, ...KNOWLEDGE]],
    [false, true, [...ALWAYS, ...KNOWLEDGE, NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID]],
    [true, true, [...ALWAYS, ...KNOWLEDGE, NIGHTSHIFT_DECISION_TREE_HYDRATE_WORKFLOW_ID]],
  ])(
    'installs the global set for wiki or memory=%s and decision trees=%s, then signals ready',
    async (wikiOrMemoryEnabled, decisionTreesEnabled, expectedIds) => {
      const { client, installMany, ready } = createClient();

      await installStaticWorkflows({ client, wikiOrMemoryEnabled, decisionTreesEnabled });

      expect(installMany).toHaveBeenCalledWith(
        expectedIds.map((id) => ({ id, spaceId: GLOBAL_WORKFLOW_SPACE_ID }))
      );
      expect(ready).toHaveBeenCalledTimes(1);
    }
  );

  it('throws with the failed workflows and does not signal ready', async () => {
    const { client, installMany, ready } = createClient();
    installMany.mockResolvedValue({
      failed: [
        {
          id: NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID,
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
          error: new Error('write failed'),
        },
      ],
    });

    const rejection = await installStaticWorkflows({
      client,
      wikiOrMemoryEnabled: false,
      decisionTreesEnabled: false,
    }).catch((error) => error);

    expect(rejection).toBeInstanceOf(AggregateError);
    expect(rejection.message).toBe(`"${NIGHTSHIFT_ONLINE_EVALS_WORKFLOW_ID}": write failed`);
    expect(rejection.errors).toEqual([expect.objectContaining({ message: 'write failed' })]);
    expect(ready).not.toHaveBeenCalled();
  });
});
