/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { PageScope } from '../../../data_view_manager/constants';
import { TestProviders } from '../../mock';
import { CellActionsDataViewProvider } from './data_view_context';
import { TimelineId } from '../../../../common/types';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';

import { CellActionsRenderer } from './cell_actions_renderer';

jest.mock('../../lib/kibana');

type MockSecurityCellActionsProps = { children: React.ReactNode } & Record<string, unknown>;

const MockSecurityCellActions = jest.fn(({ children }: MockSecurityCellActionsProps) => (
  <div data-test-subj="mockSecurityCellActions">{children}</div>
));
jest.mock('.', () => ({
  ...jest.requireActual('.'),
  SecurityCellActions: (params: MockSecurityCellActionsProps) => MockSecurityCellActions(params),
}));

const mockSourcererScopeId = 'testSourcererScopeId';
jest.mock('../../../helpers', () => ({
  getSourcererScopeId: jest.fn(() => mockSourcererScopeId),
}));

const lastCellActionsProps = () => MockSecurityCellActions.mock.lastCall?.[0];

describe('cell actions renderer', () => {
  beforeEach(() => {
    MockSecurityCellActions.mockClear();
  });

  describe('rendering', () => {
    test('it renders its children inside the cell actions', () => {
      const { getByTestId, getByText } = render(
        <CellActionsRenderer field="some-field" value="some-value" queryValue="some-query-value">
          <span>{'A child of this'}</span>
        </CellActionsRenderer>
      );

      const cellActions = getByTestId('mockSecurityCellActions');
      const content = getByTestId('render-content-some-field');

      expect(cellActions).toContainElement(content);
      expect(content).toContainElement(getByText('A child of this'));
    });

    test('it gives the cell actions the field, the query value and the scopes', () => {
      render(
        <CellActionsRenderer field="some-field" value="some-value" queryValue="some-query-value">
          <span>{'A child of this'}</span>
        </CellActionsRenderer>
      );

      expect(lastCellActionsProps()).toEqual(
        expect.objectContaining({
          data: { field: 'some-field', value: 'some-query-value' },
          sourcererScopeId: mockSourcererScopeId,
          metadata: { scopeId: TimelineId.active },
        })
      );
    });
  });

  describe('data view', () => {
    const dataView = { id: 'some-data-view-id' } as unknown as DataView;
    const scope = mockSourcererScopeId as unknown as PageScope;

    const renderWithProvider = (providerScope: PageScope, providedDataView?: DataView) =>
      render(
        <CellActionsDataViewProvider scope={providerScope} dataView={providedDataView}>
          <CellActionsRenderer field="some-field" value="some-value" />
        </CellActionsDataViewProvider>
      );

    test('it gives the cell actions the data view provided for its scope', () => {
      renderWithProvider(scope, dataView);

      expect(lastCellActionsProps()?.dataView).toBe(dataView);
    });

    test('it does not give a data view to the cell actions when none is provided', () => {
      render(<CellActionsRenderer field="some-field" value="some-value" />);

      expect(lastCellActionsProps()?.dataView).toBeUndefined();
    });

    test('it does not use a data view that was provided for another scope', () => {
      renderWithProvider('another-scope' as unknown as PageScope, dataView);

      expect(lastCellActionsProps()?.dataView).toBeUndefined();
    });

    test('it does not give a data view to the cell actions when the provider has none yet', () => {
      renderWithProvider(scope, undefined);

      expect(lastCellActionsProps()?.dataView).toBeUndefined();
    });
  });

  describe('CellActionsRenderer', () => {
    test('it works with just an id, field, and value and is some value', () => {
      const field = 'some-field';
      const value = 'some value';
      const { getByText } = render(
        <TestProviders>
          <CellActionsRenderer field={field} value={value} />
        </TestProviders>
      );
      expect(getByText(value)).toBeInTheDocument();
    });

    test('it returns null if value is undefined', () => {
      const { container } = render(<CellActionsRenderer field="some-field" value={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    test('it returns null if value is null', () => {
      const { container } = render(<CellActionsRenderer field="some-field" value={null} />);
      expect(container.firstChild).toBeNull();
    });

    test('it renders content with tooltip when tooltip is not explicitly provided', () => {
      const { getByText } = render(
        <TestProviders>
          <CellActionsRenderer field="source.bytes" value="a field value" />
        </TestProviders>
      );

      expect(getByText('a field value')).toBeInTheDocument();
    });

    test('it renders content with custom tooltip when string is provided', () => {
      const { getByText } = render(
        <TestProviders>
          <CellActionsRenderer
            field="source.bytes"
            tooltipContent="default string tooltip"
            value="a field value"
          />
        </TestProviders>
      );

      expect(getByText('a field value')).toBeInTheDocument();
    });

    test('it renders content with custom tooltip when element is provided', () => {
      const { getByText } = render(
        <TestProviders>
          <CellActionsRenderer
            field="source.bytes"
            tooltipContent={<span>{'tooltip'}</span>}
            value="a field value"
          />
        </TestProviders>
      );

      expect(getByText('a field value')).toBeInTheDocument();
    });

    test('it does NOT render a tooltip when tooltipContent is null', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <CellActionsRenderer field="source.bytes" tooltipContent={null} value="a field value" />
        </TestProviders>
      );

      expect(queryByTestId('source.bytes-tooltip')).not.toBeInTheDocument();
    });
  });

  describe('CellActionsRenderer functionality', () => {
    const field = 'host.name';
    const value = '12345';
    const data = { field, value };

    const scopeIdsWithHoverActions = [
      undefined,
      TimelineId.active,
      TableId.alternateTest,
      TimelineId.casePage,
      TableId.alertsOnAlertsPage,
      TableId.alertsOnAttacksPage,
      TableId.alertsOnRuleDetailsPage,
      TableId.hostsPageEvents,
      TableId.hostsPageSessions,
      TableId.kubernetesPageSessions,
      TableId.networkPageEvents,
      TimelineId.test,
      TableId.usersPageEvents,
    ];

    const scopeIdsNoHoverActions = [TableId.rulePreview, ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render cell actions with the content', () => {
      const result = render(
        <CellActionsRenderer field={field} value={value}>
          {'test children'}
        </CellActionsRenderer>
      );
      expect(result.queryByTestId('mockSecurityCellActions')).toBeInTheDocument();
      expect(result.queryByText('test children')).toBeInTheDocument();
    });

    it('should call cell actions with the default props', () => {
      render(
        <CellActionsRenderer field={field} value={value}>
          {'test children'}
        </CellActionsRenderer>
      );
      expect(MockSecurityCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          data,
          mode: 'hover-down',
          sourcererScopeId: mockSourcererScopeId,
          disabledActionTypes: [],
          metadata: { scopeId: TimelineId.active },
        })
      );
    });

    describe('when value is empty', () => {
      it('should set an empty array value to the SecurityCellActions component', () => {
        render(
          <CellActionsRenderer field={field} value={''}>
            {'test children'}
          </CellActionsRenderer>
        );
        expect(MockSecurityCellActions).toHaveBeenCalledWith(
          expect.objectContaining({ data: { ...data, value: [] } })
        );
      });
    });

    describe('when queryValue is provided', () => {
      it('should set value to queryValue', () => {
        render(
          <CellActionsRenderer field={field} value={value} queryValue="testQueryValue">
            {'test children'}
          </CellActionsRenderer>
        );
        expect(MockSecurityCellActions).toHaveBeenCalledWith(
          expect.objectContaining({ data: { ...data, value: 'testQueryValue' } })
        );
      });
    });

    describe('when scopeId is defined', () => {
      it('should set the scopeId to the SecurityCellActions component metadata', () => {
        render(
          <CellActionsRenderer field={field} value={value} scopeId="testScopeId">
            {'test children'}
          </CellActionsRenderer>
        );
        expect(MockSecurityCellActions).toHaveBeenCalledWith(
          expect.objectContaining({ metadata: { scopeId: 'testScopeId' } })
        );
      });
    });

    describe('when hideTopN is true', () => {
      it('should set the disabledActionTypes to the SecurityCellActions component', () => {
        render(
          <CellActionsRenderer field={field} value={value} hideTopN>
            {'test children'}
          </CellActionsRenderer>
        );
        expect(MockSecurityCellActions).toHaveBeenCalledWith(
          expect.objectContaining({ disabledActionTypes: ['security-cellAction-type-showTopN'] })
        );
      });
    });

    scopeIdsWithHoverActions.forEach((scopeId) => {
      test(`it renders hover actions (by default) when scopeId is '${scopeId}'`, async () => {
        const { getByTestId } = render(
          <CellActionsRenderer field={field} value={value} scopeId={scopeId}>
            {'test children'}
          </CellActionsRenderer>
        );
        expect(getByTestId('mockSecurityCellActions')).toBeInTheDocument();
      });
    });

    scopeIdsNoHoverActions.forEach((scopeId) => {
      test(`it does NOT render hover actions when scopeId is '${scopeId}'`, async () => {
        const { queryByTestId } = render(
          <CellActionsRenderer field={field} value={value} scopeId={scopeId}>
            {'test children'}
          </CellActionsRenderer>
        );
        expect(queryByTestId('mockSecurityCellActions')).not.toBeInTheDocument();
      });
    });

    describe('text truncation styling', () => {
      test('it applies text truncation styling when truncate IS specified', () => {
        const { getByTestId } = render(
          <TestProviders>
            <CellActionsRenderer field={field} value={value} truncate>
              {'test children'}
            </CellActionsRenderer>
          </TestProviders>
        );

        expect(getByTestId('render-truncatable-content')).toBeInTheDocument();
      });

      test('it does NOT apply text truncation styling when truncate is NOT specified', () => {
        const { queryByTestId } = render(
          <TestProviders>
            <CellActionsRenderer field={field} value={value}>
              {'test children'}
            </CellActionsRenderer>
          </TestProviders>
        );

        expect(queryByTestId('render-truncatable-content')).not.toBeInTheDocument();
      });
    });
  });
});
