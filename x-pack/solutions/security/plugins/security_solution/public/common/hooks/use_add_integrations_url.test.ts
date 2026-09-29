/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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

vi.mock('react-router-dom', () => {
  const mocked = {
    useLocation: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/security-solution-navigation', () => {
  const mocked = {
    useNavigateTo: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../helpers', () => {
  const mocked = {
    isThreatIntelligencePath: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../lib/capabilities', () => {
  const mocked = {
    hasCapabilities: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import { hasCapabilities } from '../lib/capabilities';

describe('useAddIntegrationsUrl', () => {
  const mockPrepend = vi.fn((path) => `/mock-base-path${path}`);
  const mockNavigateTo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useLocation as Mock).mockReturnValue({ pathname: '/some/path' });
    (useNavigateTo as Mock).mockReturnValue({ navigateTo: mockNavigateTo });
    (useKibana as Mock).mockReturnValue({
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
    (isThreatIntelligencePath as Mock).mockReturnValue(false);
    (hasCapabilities as Mock).mockReturnValue(false);
  });

  it('returns ADD_THREAT_INTELLIGENCE_DATA_PATH when on threat intelligence path', () => {
    (isThreatIntelligencePath as Mock).mockReturnValue(true);

    const { result } = renderHook(() => useAddIntegrationsUrl());

    expect(result.current.href).toBe(`/mock-base-path${ADD_THREAT_INTELLIGENCE_DATA_PATH}`);
    expect(mockPrepend).toHaveBeenCalledWith(ADD_THREAT_INTELLIGENCE_DATA_PATH);
  });

  it('returns CONFIGURATIONS_INTEGRATIONS_PATH when user has configurations capabilities', () => {
    (isThreatIntelligencePath as Mock).mockReturnValue(false);
    (hasCapabilities as Mock).mockReturnValue(true);

    const { result } = renderHook(() => useAddIntegrationsUrl());

    expect(result.current.href).toBe(`/mock-base-path${CONFIGURATIONS_INTEGRATIONS_PATH}`);
    expect(mockPrepend).toHaveBeenCalledWith(CONFIGURATIONS_INTEGRATIONS_PATH);
  });

  it('returns ADD_DATA_PATH when not on threat intelligence path and no configurations capabilities', () => {
    (isThreatIntelligencePath as Mock).mockReturnValue(false);
    (hasCapabilities as Mock).mockReturnValue(false);

    const { result } = renderHook(() => useAddIntegrationsUrl());

    expect(result.current.href).toBe(`/mock-base-path${ADD_DATA_PATH}`);
    expect(mockPrepend).toHaveBeenCalledWith(ADD_DATA_PATH);
  });

  it('onClick handler calls navigateTo with the correct URL and prevents default', () => {
    const { result } = renderHook(() => useAddIntegrationsUrl());

    const mockEvent = {
      preventDefault: vi.fn(),
    } as unknown as React.SyntheticEvent;

    act(() => {
      result.current.onClick(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: result.current.href });
  });

  it('updates href when dependencies change', () => {
    // Initial render with ADD_DATA_PATH
    (isThreatIntelligencePath as Mock).mockReturnValue(false);
    (hasCapabilities as Mock).mockReturnValue(false);

    const { result, rerender } = renderHook(() => useAddIntegrationsUrl());
    expect(result.current.href).toBe(`/mock-base-path${ADD_DATA_PATH}`);

    // Update to threat intelligence path
    (isThreatIntelligencePath as Mock).mockReturnValue(true);
    rerender();

    expect(result.current.href).toBe(`/mock-base-path${ADD_THREAT_INTELLIGENCE_DATA_PATH}`);
  });
});
