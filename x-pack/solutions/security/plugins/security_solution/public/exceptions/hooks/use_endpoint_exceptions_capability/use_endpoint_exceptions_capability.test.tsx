/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHasSecurityCapability as _useHasSecurityCapability } from '../../../helper_hooks';
import { renderHook as reactRenderHook } from '@testing-library/react';
import { useEndpointExceptionsCapability } from '.';

jest.mock('../../../helper_hooks');

const useHasSecurityCapabilityMock = _useHasSecurityCapability as jest.Mock;

describe('useEndpointExceptionsCapability()', () => {
  let capabilities: Record<string, boolean>;

  const renderHook = (capability: Parameters<typeof useEndpointExceptionsCapability>[0]) => {
    return reactRenderHook(() => useEndpointExceptionsCapability(capability));
  };

  beforeEach(() => {
    capabilities = {
      writeGlobalArtifacts: false,
      showEndpointExceptions: true,
      crudEndpointExceptions: true,
    };

    useHasSecurityCapabilityMock.mockImplementation((capability) =>
      Boolean(capabilities[capability])
    );
  });

  it(`should return 'true' if capability 'crudEndpointExceptions' allowed`, () => {
    capabilities.writeGlobalArtifacts = true;
    expect(renderHook('crudEndpointExceptions').result.current).toBe(true);
  });

  it(`should return 'false' if capability 'crudEndpointExceptions' is not allowed`, () => {
    capabilities.crudEndpointExceptions = false;
    expect(renderHook('crudEndpointExceptions').result.current).toBe(false);
  });

  it(`should return 'false' if capability 'crudEndpointExceptions' is allowed, but user is not allowed to manage global artifacts`, () => {
    expect(renderHook('crudEndpointExceptions').result.current).toBe(false);
  });

  it(`should return 'true' if capabilities 'crudEndpointExceptions' and manage global artifacts is allowed`, () => {
    capabilities.writeGlobalArtifacts = true;
    expect(renderHook('crudEndpointExceptions').result.current).toBe(true);
  });

  it(`should return 'true' if capability 'showEndpointExceptions' is allowed and manage global artifact is not allowed`, () => {
    expect(renderHook('showEndpointExceptions').result.current).toBe(true);
  });
});
