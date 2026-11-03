/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setUxAddInspectorRequest, takeInspect } from './ux_inspect';

describe('takeInspect', () => {
  afterEach(() => {
    setUxAddInspectorRequest(undefined);
  });

  it('forwards _inspect and strips it from the payload', () => {
    const addInspectorRequest = jest.fn();
    setUxAddInspectorRequest(addInspectorRequest);
    const inspect = [{ name: 'search' }];

    expect(takeInspect({ apps: [], _inspect: inspect })).toEqual({ apps: [] });
    expect(addInspectorRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { apps: [], _inspect: inspect },
      })
    );
  });

  it('unwraps array responses', () => {
    const addInspectorRequest = jest.fn();
    setUxAddInspectorRequest(addInspectorRequest);

    expect(takeInspect({ _wrapped: [{ name: 'ccs' }], _inspect: [] })).toEqual([{ name: 'ccs' }]);
  });

  it('returns the payload unchanged when inspect is not bound', () => {
    expect(takeInspect({ apps: [] })).toEqual({ apps: [] });
  });
});
