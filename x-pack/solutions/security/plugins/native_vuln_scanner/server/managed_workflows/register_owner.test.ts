/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGED_WORKFLOW_OWNER_ID, registerOwner } from './register_owner';

describe('registerOwner', () => {
  it('registers the plugin id as the managed workflow owner', () => {
    const workflowsExtensions = { registerManagedWorkflowOwner: jest.fn() };

    registerOwner({ workflowsExtensions: workflowsExtensions as never });

    expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledTimes(1);
    expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith(
      MANAGED_WORKFLOW_OWNER_ID
    );
    expect(MANAGED_WORKFLOW_OWNER_ID).toBe('nativeVulnScanner');
  });
});
