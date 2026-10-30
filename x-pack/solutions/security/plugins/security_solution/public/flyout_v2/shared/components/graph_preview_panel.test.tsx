/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { GraphPreviewPanel } from './graph_preview_panel';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';

const mockReportPreviewExpanded = jest.fn();

jest.mock('../hooks/use_graph_telemetry', () => ({
  useGraphTelemetry: () => ({
    onTelemetryEvent: jest.fn(),
    reportPreviewExpanded: mockReportPreviewExpanded,
  }),
}));

jest.mock('../../../common/hooks/use_upselling', () => ({
  useUpsellingComponent: () => null,
}));

jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  GRAPH_PREVIEW: 'graph-preview',
  uiMetricService: { trackUiMetric: jest.fn() },
}));

jest.mock('./graph_preview', () => ({
  GraphPreview: () => <div data-test-subj="mockGraphPreview" />,
}));

const renderPanel = (props: React.ComponentProps<typeof GraphPreviewPanel>) =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <GraphPreviewPanel {...props} />
      </EuiThemeProvider>
    </I18nProvider>
  );

const TITLE_LINK_TEST_ID = `${GRAPH_PREVIEW_TEST_ID}TitleLink`;

const defaultProps = {
  showIcon: false,
  shouldShowGraph: true,
  isLoading: false,
  isError: false,
};

describe('<GraphPreviewPanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports the expand and then calls onShowGraph when the title link is clicked', () => {
    const calls: string[] = [];
    mockReportPreviewExpanded.mockImplementation(() => calls.push('report'));
    const onShowGraph = jest.fn(() => calls.push('navigate'));

    const { getByTestId } = renderPanel({ ...defaultProps, onShowGraph });
    fireEvent.click(getByTestId(TITLE_LINK_TEST_ID));

    expect(mockReportPreviewExpanded).toHaveBeenCalledTimes(1);
    expect(onShowGraph).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['report', 'navigate']);
  });

  it('does not render the link, and reports nothing, when onShowGraph is omitted', () => {
    const { queryByTestId } = renderPanel(defaultProps);

    expect(queryByTestId(TITLE_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(mockReportPreviewExpanded).not.toHaveBeenCalled();
  });
});
