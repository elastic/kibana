/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';
import { registerSecurityWorkflowTriggers } from '.';

type TriggerLoader = () => Promise<PublicTriggerDefinition>;

const EXPECTED_TRIGGER_IDS = [
  'security.alertStatusChanged',
  'security.alertTagsChanged',
  'security.alertAssigneesChanged',
  'security.attackStatusChanged',
  'security.attackTagsChanged',
  'security.attackAssigneesChanged',
  'security.noteCreated',
  'security.noteUpdated',
];

describe('registerSecurityWorkflowTriggers (public)', () => {
  it('calls registerTriggerDefinition synchronously for all triggers', () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();

    registerSecurityWorkflowTriggers(workflowsExtensions);

    expect(workflowsExtensions.registerTriggerDefinition).toHaveBeenCalledTimes(8);
    expect(workflowsExtensions.registerTriggerDefinition).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it('each async loader resolves to a definition with the expected trigger id', async () => {
    const workflowsExtensions = workflowsExtensionsMock.createSetup();

    registerSecurityWorkflowTriggers(workflowsExtensions);

    const loaders = workflowsExtensions.registerTriggerDefinition.mock.calls.map(
      ([loader]) => loader as TriggerLoader
    );

    const resolvedIds = await Promise.all(loaders.map((loader) => loader().then((def) => def.id)));

    expect(resolvedIds).toHaveLength(EXPECTED_TRIGGER_IDS.length);
    expect(resolvedIds).toEqual(expect.arrayContaining(EXPECTED_TRIGGER_IDS));
  });
});
