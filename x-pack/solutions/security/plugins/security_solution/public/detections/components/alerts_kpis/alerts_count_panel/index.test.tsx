/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { AlertsCountPanel } from '.';

import type { Status } from '../../../../../common/api/detection_engine';
import { DEFAULT_STACK_BY_FIELD, DEFAULT_STACK_BY_FIELD1 } from '../common/config';
import { TestProviders } from '../../../../common/mock';
import { ChartContextMenu } from '../chart_panels/chart_context_menu';
import { COUNTS } from '../chart_panels/chart_select/translations';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';

const from = '2022-07-28T08:20:18.966Z';
const to = '2022-07-28T08:20:18.966Z';
jest.mock('../../../../common/containers/use_global_time', () => {
  const actual = jest.requireActual('../../../../common/containers/use_global_time');
  return {
    ...actual,
    useGlobalTime: jest
      .fn()
      .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() }),
  };
});

jest.mock('../../../../common/containers/query_toggle');
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../../../common/components/page/use_refetch_by_session');
jest.mock('../../../../common/components/visualization_actions/visualization_embeddable');
jest.mock('../../../../common/components/page/use_refetch_by_session');
jest.mock('../common/hooks', () => ({
  useInspectButton: jest.fn(),
  useStackByFields: jest.fn().mockReturnValue(() => []),
}));

const mockSetIsExpanded = jest.fn();
const defaultProps = {
  inspectTitle: COUNTS,
  signalIndexName: 'signalIndexName',
  stackByField0: DEFAULT_STACK_BY_FIELD,
  stackByField1: DEFAULT_STACK_BY_FIELD1,
  setStackByField0: jest.fn(),
  setStackByField1: jest.fn(),
  isExpanded: true,
  setIsExpanded: mockSetIsExpanded,
  showBuildingBlockAlerts: false,
  showOnlyThreatIndicatorAlerts: false,
  status: 'open' as Status,
  extraActions: [{ id: 'resetGroupByFields' }] as Action[],
};

const MockedVisualizationEmbeddable = VisualizationEmbeddable as jest.MockedFunction<
  typeof VisualizationEmbeddable
>;

describe('AlertsCountPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId('alertsCountPanel')).toBeInTheDocument();
  });

  it('renders with the specified `alignHeader` alignment', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} alignHeader="flexEnd" />
      </TestProviders>
    );

    expect(getByTestId('headerSectionInnerFlexGroup').className).toContain('flexEnd');
  });

  it('renders the inspect button by default', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} alignHeader="flexEnd" />
      </TestProviders>
    );

    expect(getByTestId('inspect-icon-button')).toBeInTheDocument();
  });
});

it('it does NOT render the inspect button when a `chartOptionsContextMenu` is provided', () => {
  const chartOptionsContextMenu = (queryId: string) => (
    <ChartContextMenu
      defaultStackByField={DEFAULT_STACK_BY_FIELD}
      defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
      queryId={queryId}
      setStackBy={jest.fn()}
      setStackByField1={jest.fn()}
    />
  );

  const { queryByTestId } = render(
    <TestProviders>
      <AlertsCountPanel {...defaultProps} chartOptionsContextMenu={chartOptionsContextMenu} />
    </TestProviders>
  );

  expect(queryByTestId('inspect-icon-button')).not.toBeInTheDocument();
});

describe('toggleQuery', () => {
  it('toggles', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} />
      </TestProviders>
    );
    act(() => {
      fireEvent.click(getByTestId('query-toggle-header'));
    });

    expect(mockSetIsExpanded).toBeCalledWith(false);
  });

  it('when isExpanded is true, render counts panel', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('visualization-embeddable')).toBeInTheDocument();
  });
  it('when isExpanded is false, hide counts panel', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} isExpanded={false} />
      </TestProviders>
    );
    expect(queryByTestId('visualization-embeddable')).not.toBeInTheDocument();
  });
});

describe('Visualization', () => {
  it('should render embeddable', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} />
      </TestProviders>
    );
    expect(getByTestId('visualization-embeddable')).toBeInTheDocument();
  });

  it('should render with provided height', () => {
    render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} />
      </TestProviders>
    );
    expect(MockedVisualizationEmbeddable.mock.calls[0][0].height).toEqual(218);
  });

  it('should render with extra actions', () => {
    render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} />
      </TestProviders>
    );
    expect(MockedVisualizationEmbeddable.mock.calls[0][0].extraActions?.[0]?.id).toEqual(
      'resetGroupByFields'
    );
  });

  it('should render with extra options', () => {
    render(
      <TestProviders>
        <AlertsCountPanel {...defaultProps} />
      </TestProviders>
    );
    expect(MockedVisualizationEmbeddable.mock.calls[0][0].extraOptions?.breakdownField).toEqual(
      defaultProps.stackByField1
    );
  });
});
