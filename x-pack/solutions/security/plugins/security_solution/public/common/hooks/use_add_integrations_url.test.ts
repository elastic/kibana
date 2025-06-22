/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import { useAddIntegrationsUrl } from './use_add_integrations_url';
import { useKibana } from '../lib/kibana';
import { isThreatIntelligencePath } from '../../helpers';
import {
  ADD_DATA_PATH,
  ADD_THREAT_INTELLIGENCE_DATA_PATH,
  CONFIGURATIONS_INTEGRATIONS_PATH,
} from '../../../common/constants';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

jest.mock('@kbn/security-solution-navigation', () => ({
  useNavigateTo: jest.fn(),
}));

jest.mock('../lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../helpers', () => ({
  isThreatIntelligencePath: jest.fn(),
}));

jest.mock('../lib/capabilities', () => ({
  hasCapabilities: jest.fn(),
}));

import { hasCapabilities } from '../lib/capabilities';

describe('useAddIntegrationsUrl', () => {
  const mockPrepend = jest.fn((path) => `/mock-base-path${path}`);
  const mockNavigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useLocation as jest.Mock).mockReturnValue({ pathname: '/some/path' });
    (useNavigateTo as jest.Mock).mockReturnValue({ navigateTo: mockNavigateTo });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          basePath: {
            prepend: mockPrepend,
          },
        },
        application: {
          capabilities: {},
        },
      },
    });
    (isThreatIntelligencePath as jest.Mock).mockReturnValue(false);
    (hasCapabilities as jest.Mock).mockReturnValue(false);
  });

  it('returns ADD_THREAT_INTELLIGENCE_DATA_PATH when on threat intelligence path', () => {
    (isThreatIntelligencePath as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useAddIntegrationsUrl());

    expect(result.current.href).toBe(`/mock-base-path${ADD_THREAT_INTELLIGENCE_DATA_PATH}`);
    expect(mockPrepend).toHaveBeenCalledWith(ADD_THREAT_INTELLIGENCE_DATA_PATH);
  });

  it('returns CONFIGURATIONS_INTEGRATIONS_PATH when user has configurations capabilities', () => {
    (isThreatIntelligencePath as jest.Mock).mockReturnValue(false);
    (hasCapabilities as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useAddIntegrationsUrl());

    expect(result.current.href).toBe(`/mock-base-path${CONFIGURATIONS_INTEGRATIONS_PATH}`);
    expect(mockPrepend).toHaveBeenCalledWith(CONFIGURATIONS_INTEGRATIONS_PATH);
  });

  it('returns ADD_DATA_PATH when not on threat intelligence path and no configurations capabilities', () => {
    (isThreatIntelligencePath as jest.Mock).mockReturnValue(false);
    (hasCapabilities as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useAddIntegrationsUrl());

    expect(result.current.href).toBe(`/mock-base-path${ADD_DATA_PATH}`);
    expect(mockPrepend).toHaveBeenCalledWith(ADD_DATA_PATH);
  });

  it('onClick handler calls navigateTo with the correct URL and prevents default', () => {
    const { result } = renderHook(() => useAddIntegrationsUrl());

    const mockEvent = {
      preventDefault: jest.fn(),
    } as unknown as React.SyntheticEvent;

    act(() => {
      result.current.onClick(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: result.current.href });
  });

  it('updates href when dependencies change', () => {
    // Initial render with ADD_DATA_PATH
    (isThreatIntelligencePath as jest.Mock).mockReturnValue(false);
    (hasCapabilities as jest.Mock).mockReturnValue(false);

    const { result, rerender } = renderHook(() => useAddIntegrationsUrl());
    expect(result.current.href).toBe(`/mock-base-path${ADD_DATA_PATH}`);

    // Update to threat intelligence path
    (isThreatIntelligencePath as jest.Mock).mockReturnValue(true);
    rerender();

    expect(result.current.href).toBe(`/mock-base-path${ADD_THREAT_INTELLIGENCE_DATA_PATH}`);
  });
});
