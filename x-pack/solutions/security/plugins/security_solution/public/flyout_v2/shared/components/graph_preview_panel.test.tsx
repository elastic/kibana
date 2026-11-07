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
import type { GraphPreviewData } from './graph_preview_panel';
import { GraphPreviewPanel } from './graph_preview_panel';
import { GRAPH_PREVIEW_TEST_ID } from './test_ids';

const mockReportGraphPreviewShown = jest.fn();
const mockReportGraphPreviewExpanded = jest.fn();
const mockUseGraphTelemetry = jest.fn();

jest.mock('../hooks/use_graph_telemetry', () => ({
  useGraphTelemetry: (entryPoint: string) => mockUseGraphTelemetry(entryPoint),
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

const wrapPanel = (props: React.ComponentProps<typeof GraphPreviewPanel>) => (
  <I18nProvider>
    <EuiThemeProvider>
      <GraphPreviewPanel {...props} />
    </EuiThemeProvider>
  </I18nProvider>
);

const renderPanel = (props: React.ComponentProps<typeof GraphPreviewPanel>) =>
  render(wrapPanel(props));

const TITLE_LINK_TEST_ID = `${GRAPH_PREVIEW_TEST_ID}TitleLink`;

const defaultProps = {
  entryPoint: 'alert_flyout' as const,
  showIcon: false,
  shouldShowGraph: true,
  isLoading: false,
  isError: false,
};

const dataWithNodes: GraphPreviewData = {
  nodes: [{ id: 'node-1', color: 'primary', shape: 'ellipse' }],
  edges: [],
};

const emptyData: GraphPreviewData = { nodes: [], edges: [] };

describe('<GraphPreviewPanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // A new function identity on every call, like the hook returns when telemetry or entryPoint change.
    mockUseGraphTelemetry.mockImplementation(() => ({
      onTelemetryEvent: jest.fn(),
      reportGraphPreviewShown: (isEmpty: boolean) => mockReportGraphPreviewShown(isEmpty),
      reportGraphPreviewExpanded: mockReportGraphPreviewExpanded,
      reportGraphOpened: jest.fn(),
      reportDrillThrough: jest.fn(),
    }));
  });

  it('reports through the entry point it was given', () => {
    renderPanel({ ...defaultProps, entryPoint: 'entity_data_grid' });

    expect(mockUseGraphTelemetry).toHaveBeenCalledWith('entity_data_grid');
  });

  it('reports the expand and then calls onShowGraph when the title link is clicked', () => {
    const calls: string[] = [];
    mockReportGraphPreviewExpanded.mockImplementation(() => calls.push('report'));
    const onShowGraph = jest.fn(() => calls.push('navigate'));

    const { getByTestId } = renderPanel({ ...defaultProps, data: dataWithNodes, onShowGraph });
    fireEvent.click(getByTestId(TITLE_LINK_TEST_ID));

    expect(mockReportGraphPreviewExpanded).toHaveBeenCalledTimes(1);
    expect(onShowGraph).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['report', 'navigate']);
  });

  it('does not render the link, and reports nothing, when onShowGraph is omitted', () => {
    const { queryByTestId } = renderPanel(defaultProps);

    expect(queryByTestId(TITLE_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(mockReportGraphPreviewExpanded).not.toHaveBeenCalled();
  });

  describe('graph preview shown report', () => {
    it('reports isEmpty false when the loaded preview has nodes', () => {
      renderPanel({ ...defaultProps, data: dataWithNodes });

      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);
      expect(mockReportGraphPreviewShown).toHaveBeenCalledWith(false);
    });

    it('reports isEmpty true when the loaded preview has no nodes', () => {
      renderPanel({ ...defaultProps, data: emptyData });

      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);
      expect(mockReportGraphPreviewShown).toHaveBeenCalledWith(true);
    });

    it('reports isEmpty true when the loaded preview has no data, which GraphPreview renders as empty', () => {
      renderPanel({ ...defaultProps, data: undefined });

      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);
      expect(mockReportGraphPreviewShown).toHaveBeenCalledWith(true);
    });

    it('does not report while the graph is loading', () => {
      renderPanel({ ...defaultProps, isLoading: true, data: dataWithNodes });

      expect(mockReportGraphPreviewShown).not.toHaveBeenCalled();
    });

    it('does not report while the graph is loading without data', () => {
      renderPanel({ ...defaultProps, isLoading: true, data: undefined });

      expect(mockReportGraphPreviewShown).not.toHaveBeenCalled();
    });

    it('does not report when loading the graph failed', () => {
      renderPanel({ ...defaultProps, isError: true, data: dataWithNodes });

      expect(mockReportGraphPreviewShown).not.toHaveBeenCalled();
    });

    it('does not report when loading the graph failed without data', () => {
      renderPanel({ ...defaultProps, isError: true, data: undefined });

      expect(mockReportGraphPreviewShown).not.toHaveBeenCalled();
    });

    it('does not report when the graph is not available (license upsell)', () => {
      renderPanel({ ...defaultProps, shouldShowGraph: false, data: dataWithNodes });

      expect(mockReportGraphPreviewShown).not.toHaveBeenCalled();
    });

    it('does not report an empty preview when the graph is not available (license upsell)', () => {
      renderPanel({ ...defaultProps, shouldShowGraph: false, data: emptyData });

      expect(mockReportGraphPreviewShown).not.toHaveBeenCalled();
    });

    it('reports once with isEmpty false when loading finishes with nodes', () => {
      const { rerender } = renderPanel({ ...defaultProps, isLoading: true, data: undefined });
      expect(mockReportGraphPreviewShown).not.toHaveBeenCalled();

      rerender(wrapPanel({ ...defaultProps, isLoading: false, data: dataWithNodes }));

      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);
      expect(mockReportGraphPreviewShown).toHaveBeenCalledWith(false);
    });

    it('reports once with isEmpty true when loading finishes without nodes', () => {
      const { rerender } = renderPanel({ ...defaultProps, isLoading: true, data: undefined });
      expect(mockReportGraphPreviewShown).not.toHaveBeenCalled();

      rerender(wrapPanel({ ...defaultProps, isLoading: false, data: emptyData }));

      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);
      expect(mockReportGraphPreviewShown).toHaveBeenCalledWith(true);
    });

    it('does not report again when an empty preview later gets nodes', () => {
      const { rerender } = renderPanel({ ...defaultProps, data: emptyData });
      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);

      rerender(wrapPanel({ ...defaultProps, data: dataWithNodes }));

      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);
      expect(mockReportGraphPreviewShown).toHaveBeenCalledWith(true);
    });

    it('does not report again when the preview reloads after it was reported', () => {
      const { rerender } = renderPanel({ ...defaultProps, data: dataWithNodes });

      rerender(wrapPanel({ ...defaultProps, isLoading: true, data: undefined }));
      rerender(wrapPanel({ ...defaultProps, isLoading: false, data: emptyData }));

      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);
      expect(mockReportGraphPreviewShown).toHaveBeenCalledWith(false);
    });

    it('reports only once per mount when re-rendered, even if the report function changes identity', () => {
      const { rerender } = renderPanel({ ...defaultProps, data: dataWithNodes });
      const firstReport = mockUseGraphTelemetry.mock.results[0].value.reportGraphPreviewShown;

      rerender(wrapPanel({ ...defaultProps, data: dataWithNodes }));
      rerender(wrapPanel({ ...defaultProps, data: { ...dataWithNodes } }));

      const lastReport = mockUseGraphTelemetry.mock.results.at(-1)?.value.reportGraphPreviewShown;
      expect(lastReport).not.toBe(firstReport);
      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(1);
    });

    it('reports again for a new mount', () => {
      const { unmount } = renderPanel({ ...defaultProps, data: dataWithNodes });
      unmount();

      renderPanel({ ...defaultProps, data: dataWithNodes });

      expect(mockReportGraphPreviewShown).toHaveBeenCalledTimes(2);
    });

    it('does not report the expand when the preview is only shown', () => {
      renderPanel({ ...defaultProps, data: dataWithNodes, onShowGraph: jest.fn() });

      expect(mockReportGraphPreviewExpanded).not.toHaveBeenCalled();
    });
  });
});
