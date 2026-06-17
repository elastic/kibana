/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { BUILTIN_WORKFLOWS, installBuiltinWorkflows } from '.';

describe('installBuiltinWorkflows', () => {
  it('registers threat intelligence workflows in the default space', async () => {
    const bulkEnsureBuiltinWorkflows = jest.fn().mockResolvedValue({ results: [], failures: [] });
    const workflowsManagement = {
      management: { bulkEnsureBuiltinWorkflows },
    } as unknown as WorkflowsServerPluginSetup;

    await installBuiltinWorkflows({ workflowsManagement, logger: loggerMock.create() });

    expect(bulkEnsureBuiltinWorkflows).toHaveBeenCalledWith(
      BUILTIN_WORKFLOWS.map((wf) => ({
        id: wf.id,
        yaml: wf.yaml,
        owner: 'threatIntelligence',
      })),
      'default'
    );
  });
});
