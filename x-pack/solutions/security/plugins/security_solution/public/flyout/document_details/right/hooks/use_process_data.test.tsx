/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUserDisplayName, useProcessData } from './use_process_data';
import { renderHook } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { DocumentDetailsContext } from '../../shared/context';
import React from 'react';

describe('getUserDisplayName', () => {
  const getFieldsData = jest.fn();

  it('should return userName', () => {
    getFieldsData.mockImplementation((field: string) => {
      if (field === 'process.entry_leader.user.name') {
        return 'userName';
      }
    });

    expect(getUserDisplayName(getFieldsData)).toEqual('userName');
  });

  it('should return unknown', () => {
    getFieldsData.mockImplementation((field: string) => undefined);

    expect(getUserDisplayName(getFieldsData)).toEqual('unknown');
  });

  it('should return root', () => {
    getFieldsData.mockImplementation((field: string) => {
      if (field === 'process.entry_leader.user.name') {
        return undefined;
      }
      if (field === 'process.entry_leader.user.id') {
        return '0';
      }
    });

    expect(getUserDisplayName(getFieldsData)).toEqual('root');
  });

  it('should return uid+userId', () => {
    getFieldsData.mockImplementation((field: string) => {
      if (field === 'process.entry_leader.user.name') {
        return undefined;
      }
      if (field === 'process.entry_leader.user.id') {
        return 'userId';
      }
    });

    expect(getUserDisplayName(getFieldsData)).toEqual('uid: userId');
  });
});

const panelContextValue = {
  getFieldsData: jest.fn().mockReturnValue('test'),
} as unknown as DocumentDetailsContext;

const ProviderComponent: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <DocumentDetailsContext.Provider value={panelContextValue}>
    {children}
  </DocumentDetailsContext.Provider>
);

describe('useProcessData', () => {
  it('should return values for session preview component', () => {
    const hookResult = renderHook(() => useProcessData(), {
      wrapper: ProviderComponent,
    });

    expect(hookResult.result.current).toEqual({
      command: 'test',
      processName: 'test',
      ruleName: 'test',
      ruleId: 'test',
      startAt: 'test',
      userName: 'test',
      workdir: 'test',
    });
  });
});
