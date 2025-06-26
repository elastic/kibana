/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CellActionsWrapper } from './cell_actions_wrapper';
import { CellActionsMode, SecurityCellActionType } from '../cell_actions';
import { TimelineId, type DataProvider } from '../../../../common/types';

const MockSecurityCellActions = jest.fn(({ children }: { children: React.ReactNode }) => (
  <div data-test-subj="mockSecurityCellActions">{children}</div>
));
jest.mock('../cell_actions', () => ({
  ...jest.requireActual('../cell_actions'),
  SecurityCellActions: (params: { children: React.ReactNode }) => MockSecurityCellActions(params),
}));

const mockSourcererScopeId = 'testSourcererScopeId';
jest.mock('../../../helpers', () => ({
  getSourcererScopeId: jest.fn(() => mockSourcererScopeId),
}));

const dataProvider = { queryMatch: { field: 'host.name', value: '12345' } } as DataProvider;
const data = { ...dataProvider.queryMatch };

describe('CellActionsWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render cell actions with the content', () => {
    const result = render(
      <CellActionsWrapper dataProvider={dataProvider}>{'test children'}</CellActionsWrapper>
    );
    expect(result.queryByTestId('mockSecurityCellActions')).toBeInTheDocument();
    expect(result.queryByText('test children')).toBeInTheDocument();
  });

  it('should call cell actions with the default props', () => {
    render(<CellActionsWrapper dataProvider={dataProvider}>{'test children'}</CellActionsWrapper>);
    expect(MockSecurityCellActions).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        mode: CellActionsMode.HOVER_DOWN,
        sourcererScopeId: mockSourcererScopeId,
        disabledActionTypes: [],
        metadata: { scopeId: TimelineId.active },
      })
    );
  });

  describe('when dataProvider value is empty', () => {
    it('should set an empty array value to the SecurityCellActions component', () => {
      const emptyValueDataProvider = {
        queryMatch: { field: 'host.name', value: '' },
      } as DataProvider;
      render(
        <CellActionsWrapper dataProvider={emptyValueDataProvider}>
          {'test children'}
        </CellActionsWrapper>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ...data, value: [] } })
      );
    });
  });

  describe('when scopeId is defined', () => {
    it('should set the scopeId to the SecurityCellActions component metadata', () => {
      render(
        <CellActionsWrapper dataProvider={dataProvider} scopeId="testScopeId">
          {'test children'}
        </CellActionsWrapper>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { scopeId: 'testScopeId' } })
      );
    });
  });

  describe('when hideTopN is true', () => {
    it('should set the disabledActionTypes to the SecurityCellActions component', () => {
      render(
        <CellActionsWrapper dataProvider={dataProvider} hideTopN>
          {'test children'}
        </CellActionsWrapper>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({ disabledActionTypes: [SecurityCellActionType.SHOW_TOP_N] })
      );
    });
  });
});
