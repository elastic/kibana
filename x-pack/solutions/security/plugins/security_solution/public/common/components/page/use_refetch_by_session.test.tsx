/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import React from 'react';
import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../mock';
import { useKibana } from '../../lib/kibana';
import { InputsModelId } from '../../store/inputs/constants';
import { useRefetchByRestartingSession } from './use_refetch_by_session';
import { inputsActions } from '../../store/actions';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
);

vi.mock('react-redux-v7', () => {
  const actual = require('react-redux-v7');
  const mockDispatch = vi.fn();
  return {
    ...actual,
    useDispatch: vi.fn().mockReturnValue(mockDispatch),
  };
});

vi.mock('../../lib/kibana', () => {
  return {
    useKibana: vi.fn(),
  };
});

vi.mock('../../store/actions', () => {
  return {
    inputsActions: {
      setInspectionParameter: vi.fn(),
    },
  };
});

describe(`useRefetchByRestartingSession`, () => {
  let res: RenderHookResult<
    ReturnType<typeof useRefetchByRestartingSession>,
    Parameters<typeof useRefetchByRestartingSession>[0]
  >;
  const mockSessionStart = vi.fn().mockReturnValue('mockSessionId');
  const mockSession = {
    start: mockSessionStart,
  };
  beforeAll(() => {
    (useKibana as Mock).mockReturnValue({
      services: {
        data: {
          search: {
            session: mockSession,
          },
        },
      },
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    res = renderHook(
      () =>
        useRefetchByRestartingSession({
          inputId: InputsModelId.global,
          queryId: 'test',
        }),
      {
        wrapper,
      }
    );
  });

  it('should start a session when clicking refetchByRestartingSession', () => {
    res.result.current.refetchByRestartingSession();
    expect(mockSessionStart).toHaveBeenCalledTimes(1);
    expect(inputsActions.setInspectionParameter).toHaveBeenCalledWith({
      id: 'test',
      selectedInspectIndex: 0,
      isInspected: false,
      inputId: InputsModelId.global,
      searchSessionId: 'mockSessionId',
    });
  });
});
