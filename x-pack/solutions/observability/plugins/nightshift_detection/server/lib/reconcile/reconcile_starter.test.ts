/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { NIGHTSHIFT_DETECTION_SOURCE_CHANGED } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ReconcileStarter } from './reconcile_starter';

const REQUEST = httpServerMock.createKibanaRequest();

function setUp(workflow: { enabled: boolean; definition: object } | null) {
  const management = {
    getWorkflow: jest.fn().mockResolvedValue(workflow),
    runWorkflow: jest.fn().mockResolvedValue('execution-id'),
  };
  const spaces = {
    spacesService: { getSpaceId: () => 'space-a' },
  } as unknown as SpacesPluginStart;
  const starter = new ReconcileStarter(
    { management } as unknown as WorkflowsServerPluginSetup,
    spaces
  );
  return { management, starter };
}

describe('ReconcileStarter', () => {
  it("starts the space's reconcile workflow as a source change, which its guard lets through", async () => {
    const { management, starter } = setUp({ enabled: true, definition: { name: 'reconcile' } });

    await expect(starter.start(REQUEST)).resolves.toBe(true);

    expect(management.getWorkflow).toHaveBeenCalledWith(
      'system-nightshift-detection-reconcile-space-a',
      'space-a',
      REQUEST
    );
    expect(management.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ definition: { name: 'reconcile' } }),
      'space-a',
      {},
      REQUEST,
      NIGHTSHIFT_DETECTION_SOURCE_CHANGED
    );
  });

  it.each([
    ['is not set up', null],
    ['is turned off', { enabled: false, definition: {} }],
  ])('starts nothing in a space whose engine %s', async (_, workflow) => {
    const { management, starter } = setUp(workflow);

    await expect(starter.start(REQUEST)).resolves.toBe(false);

    expect(management.runWorkflow).not.toHaveBeenCalled();
  });
});
