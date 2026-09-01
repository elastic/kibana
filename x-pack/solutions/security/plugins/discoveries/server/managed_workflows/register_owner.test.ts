/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerOwner } from './register_owner';

const createMockWorkflowsExtensions = () => ({
  registerManagedWorkflowOwner: jest.fn(),
  registerStepType: jest.fn(),
});

describe('registerOwner', () => {
  it('calls registerManagedWorkflowOwner with the discoveries plugin id', () => {
    const workflowsExtensions = createMockWorkflowsExtensions();

    registerOwner({ workflowsExtensions: workflowsExtensions as never });

    expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledTimes(1);
    expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith('discoveries');
  });
});
