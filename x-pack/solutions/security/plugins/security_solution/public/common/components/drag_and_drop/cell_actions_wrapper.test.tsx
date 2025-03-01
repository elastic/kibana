/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TableId } from '@kbn/securitysolution-data-table';
import { CellActionsWrapper, disableHoverActions } from './cell_actions_wrapper';
import { CellActionsMode, SecurityCellActionType } from '../cell_actions';
import { TimelineId } from '../../../../common/types';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';
import { TestProviders } from '../../mock';

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

const field= 'host.name'
const value= '12345';
const data = { field, value };

const scopeIdsWithHoverActions = [
  undefined,
  TimelineId.active,
  TableId.alternateTest,
  TimelineId.casePage,
  TableId.alertsOnAlertsPage,
  TableId.alertsOnRuleDetailsPage,
  TableId.hostsPageEvents,
  TableId.hostsPageSessions,
  TableId.kubernetesPageSessions,
  TableId.networkPageEvents,
  TimelineId.test,
  TableId.usersPageEvents,
];

const scopeIdsNoHoverActions = [TableId.rulePreview, ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID];

describe('CellActionsWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render cell actions with the content', () => {
    const result = render(
      <CellActionsWrapper field={field} value={value}>{'test children'}</CellActionsWrapper>
    );
    expect(result.queryByTestId('mockSecurityCellActions')).toBeInTheDocument();
    expect(result.queryByText('test children')).toBeInTheDocument();
  });

  it('should call cell actions with the default props', () => {
    render(<CellActionsWrapper field={field} value={value}>{'test children'}</CellActionsWrapper>);
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

  describe('when value is empty', () => {
    it('should set an empty array value to the SecurityCellActions component', () => {
      render(
        <CellActionsWrapper field={field} value={''}>
          {'test children'}
        </CellActionsWrapper>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ...data, value: [] } })
      );
    });
  });

  describe('when queryValue is provided', () => {
    it('should set value to queryValue', () => {
      render(
        <CellActionsWrapper field={field} value={value} queryValue="testQueryValue">
          {'test children'}
        </CellActionsWrapper>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ...data, value: "testQueryValue" } })
      );
    });
  });

  describe('when scopeId is defined', () => {
    it('should set the scopeId to the SecurityCellActions component metadata', () => {
      render(
        <CellActionsWrapper field={field} value={value} scopeId="testScopeId">
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
        <CellActionsWrapper field={field} value={value} hideTopN>
          {'test children'}
        </CellActionsWrapper>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({ disabledActionTypes: [SecurityCellActionType.SHOW_TOP_N] })
      );
    });
  });

  scopeIdsWithHoverActions.forEach((scopeId) => {
    test(`it renders hover actions (by default) when scopeId is '${scopeId}'`, async () => {
      const { getByTestId } = render(
            <CellActionsWrapper
              field={field}
              value={value}
              scopeId={scopeId}
            >
              {'test children'}
            </CellActionsWrapper>
      );
      expect(getByTestId('mockSecurityCellActions')).toBeInTheDocument();
    });
  });

  scopeIdsNoHoverActions.forEach((scopeId) => {
    test(`it does NOT render hover actions when scopeId is '${scopeId}'`, async () => {
      const { queryByTestId } = render(
          <CellActionsWrapper
            field={field}
            value={value}
            scopeId={scopeId}
          >
            {'test children'}
          </CellActionsWrapper>
      );
      expect(queryByTestId('mockSecurityCellActions')).not.toBeInTheDocument();
    });
  });

  describe('disableHoverActions', () => {
    scopeIdsNoHoverActions.forEach((scopeId) =>
      test(`it returns true when timelineId is ${scopeId}`, () => {
        expect(disableHoverActions(scopeId)).toBe(true);
      })
    );

    scopeIdsWithHoverActions.forEach((scopeId) =>
      test(`it returns false when timelineId is ${scopeId}`, () => {
        expect(disableHoverActions(scopeId)).toBe(false);
      })
    );
  });

  describe('text truncation styling', () => {
    test('it applies text truncation styling when truncate IS specified (implicit: and the user is not dragging)', () => {
      const {getByTestId} = render(
        <TestProviders>
          <CellActionsWrapper field={field} value={value} truncate>
            {'test children'}
          </CellActionsWrapper>
        </TestProviders>
      );

      expect(getByTestId('render-truncatable-content')).toBeInTheDocument();
    });

    test('it does NOT apply text truncation styling when truncate is NOT specified', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <CellActionsWrapper field={field} value={value}>
            {'test children'}
          </CellActionsWrapper>
        </TestProviders>
      );

      expect(queryByTestId('render-truncatable-content')).not.toBeInTheDocument();
    });
  });
});

