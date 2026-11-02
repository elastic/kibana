/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { render } from '@testing-library/react';
import { TestProviders, createMockStore, mockGlobalState } from '../../../../common/mock';
import { TableId } from '@kbn/securitysolution-data-table';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { RulePreviewAlertsTable } from './rule_preview_alerts_table';
import { DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';
import type { EventsViewerProps } from '../../../../common/components/events_viewer';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/containers/use_full_screen', () => ({
  useGlobalFullScreen: jest.fn().mockReturnValue({ globalFullScreen: false }),
}));
jest.mock('../../../../common/hooks/use_license', () => ({
  useLicense: jest.fn(() => ({
    isPlatinumPlus: jest.fn(() => false),
    isEnterprise: jest.fn(() => false),
  })),
}));

const mockStatefulEventsViewer = jest.fn((_props: EventsViewerProps) => null);
jest.mock('../../../../common/components/events_viewer', () => ({
  StatefulEventsViewer: (props: EventsViewerProps) => mockStatefulEventsViewer(props),
}));

jest.mock(
  '../../../../detections/configurations/security_solution_detections/cell_value_context',
  () => ({
    AlertTableCellContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  })
);

jest.mock('../../../../common/utils/normalize_time_range');

const store = createMockStore({
  ...mockGlobalState,
  dataTable: {
    ...mockGlobalState.dataTable,
    tableById: {
      [TableId.rulePreview]: {
        ...mockGlobalState.dataTable.tableById[TableId.test],
      },
    },
  },
});

const defaultProps = {
  previewId: 'test-preview-id',
  spaceId: 'default',
  indexPattern: undefined,
  timeframeOptions: {
    timeframeStart: moment('2024-01-01T00:00:00.000Z'),
    timeframeEnd: moment('2024-01-02T00:00:00.000Z'),
    interval: '5m',
    lookback: '1m',
  },
};

describe('RulePreviewAlertsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGlobalFullScreen as jest.Mock).mockReturnValue({ globalFullScreen: false });
  });

  it('passes start date derived from timeframeStart to StatefulEventsViewer', () => {
    render(
      <TestProviders store={store}>
        <RulePreviewAlertsTable {...defaultProps} />
      </TestProviders>
    );

    expect(mockStatefulEventsViewer.mock.calls[0][0].start).toBe(
      defaultProps.timeframeOptions.timeframeStart.toISOString()
    );
  });

  it('passes end date extended by 1s from timeframeEnd to StatefulEventsViewer', () => {
    render(
      <TestProviders store={store}>
        <RulePreviewAlertsTable {...defaultProps} />
      </TestProviders>
    );

    const expectedEnd = defaultProps.timeframeOptions.timeframeEnd
      .clone()
      .add('1', 's')
      .toISOString();
    expect(mockStatefulEventsViewer.mock.calls[0][0].end).toBe(expectedEnd);
  });

  it('filters by the preview rule UUID in pageFilters', () => {
    render(
      <TestProviders store={store}>
        <RulePreviewAlertsTable {...defaultProps} />
      </TestProviders>
    );

    const { pageFilters } = mockStatefulEventsViewer.mock.calls[0][0];
    expect(pageFilters).toHaveLength(1);
    expect(pageFilters![0].meta.key).toBe('kibana.alert.rule.uuid');
    expect((pageFilters![0].meta.params as { query: string }).query).toBe('test-preview-id');
  });

  it('scopes indexNames to the preview index for the given spaceId', () => {
    render(
      <TestProviders store={store}>
        <RulePreviewAlertsTable {...defaultProps} spaceId="my-space" />
      </TestProviders>
    );

    expect(mockStatefulEventsViewer.mock.calls[0][0].indexNames).toEqual([
      `${DEFAULT_PREVIEW_INDEX}-my-space`,
    ]);
  });

  it('sets container height to 100% when globalFullScreen is true', () => {
    (useGlobalFullScreen as jest.Mock).mockReturnValue({ globalFullScreen: true });

    const { container } = render(
      <TestProviders store={store}>
        <RulePreviewAlertsTable {...defaultProps} />
      </TestProviders>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ height: '100%' });
  });

  it('does not set container height when globalFullScreen is false', () => {
    const { container } = render(
      <TestProviders store={store}>
        <RulePreviewAlertsTable {...defaultProps} />
      </TestProviders>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).not.toHaveStyle({ height: '100%' });
  });
});
