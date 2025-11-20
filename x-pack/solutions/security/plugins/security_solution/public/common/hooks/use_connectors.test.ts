/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { useLoadConnectors } from '@kbn/response-ops-rule-form/src/common/hooks';
import type { HttpSetup } from '@kbn/core/public';

import { useConnectors } from './use_connectors';

jest.mock('@kbn/response-ops-rule-form/src/common/hooks');

const mockHttp = {
  fetch: jest.fn(),
} as unknown as HttpSetup;

describe('useConnectors', () => {
  const mockConnector1: ActionConnector = {
    id: 'connector-1',
    name: 'Test Connector 1',
    actionTypeId: '.webhook',
    config: {},
  } as ActionConnector;

  const mockConnector2: ActionConnector = {
    id: 'connector-2',
    name: 'Test Connector 2',
    actionTypeId: '.email',
    config: {},
    isPreconfigured: false,
  } as ActionConnector;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all connectors when loaded successfully', () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [mockConnector1, mockConnector2],
      isLoading: false,
    });

    const { result } = renderHook(() => useConnectors({ http: mockHttp }));

    expect(result.current.connectors).toEqual([mockConnector1, mockConnector2]);
  });

  it('returns only current connector when connectors are empty', () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { result } = renderHook(() => useConnectors({ http: mockHttp }));

    act(() => {
      result.current.setCurrentConnector(mockConnector1);
    });

    expect(result.current.connectors).toEqual([mockConnector1]);
  });

  it('merges current connector with all connectors when current connector is not in the list', () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [mockConnector1],
      isLoading: false,
    });

    const { result } = renderHook(() => useConnectors({ http: mockHttp }));

    act(() => {
      result.current.setCurrentConnector(mockConnector2);
    });

    expect(result.current.connectors).toEqual([mockConnector1, mockConnector2]);
  });

  it('does not duplicate connector when current connector already exists in all connectors', () => {
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: [mockConnector1, mockConnector2],
      isLoading: false,
    });

    const { result } = renderHook(() => useConnectors({ http: mockHttp }));

    act(() => {
      result.current.setCurrentConnector(mockConnector1);
    });

    expect(result.current.connectors).toEqual([mockConnector1, mockConnector2]);
  });
});
