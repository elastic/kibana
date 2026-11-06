/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import {
  GraphGroupedNodePreviewPanel,
  GraphGroupedNodePreviewPanelKey,
} from '@kbn/cloud-security-posture-graph';
import { expandableFlyoutDocumentsPanels } from '.';
import { useGraphTelemetry } from '../flyout_v2/shared/hooks/use_graph_telemetry';
import { mockFlyoutApi } from './document_details/shared/mocks/mock_flyout_context';
import type { GraphGroupedNodePreviewPanelParams } from './shared/graph_grouped_node_preview_panel_params';

jest.mock('@kbn/expandable-flyout', () => ({
  ...jest.requireActual('@kbn/expandable-flyout'),
  useExpandableFlyoutApi: jest.fn(),
}));

jest.mock('@kbn/cloud-security-posture-graph', () => ({
  GraphGroupedNodePreviewPanelKey: 'graphGroupedNodePreviewPanel',
  GraphGroupedNodePreviewPanel: jest.fn(() => <div data-test-subj="mockGroupedPanel" />),
}));

jest.mock('../flyout_v2/shared/hooks/use_graph_telemetry');

const mockOnTelemetryEvent = jest.fn();

const params: GraphGroupedNodePreviewPanelParams = {
  entryPoint: 'entity_data_grid',
  docMode: 'grouped-entities',
  scopeId: 'graph-scope',
  dataViewId: 'data-view-id',
  documentIds: [],
  entityItems: [],
};

const renderRegisteredPanel = (panelParams: GraphGroupedNodePreviewPanelParams) => {
  const registration = expandableFlyoutDocumentsPanels.find(
    ({ key }) => key === GraphGroupedNodePreviewPanelKey
  );
  const element = registration?.component({
    id: GraphGroupedNodePreviewPanelKey,
    params: panelParams,
  });
  return render(<>{element}</>);
};

describe('legacy flyout registration of the grouped entities / grouped events panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
    jest.mocked(useGraphTelemetry).mockReturnValue({
      onTelemetryEvent: mockOnTelemetryEvent,
      reportGraphPreviewShown: jest.fn(),
      reportGraphPreviewExpanded: jest.fn(),
      reportGraphOpened: jest.fn(),
      reportDrillThrough: jest.fn(),
    });
  });

  it('reports telemetry with the entry point carried in the panel params', async () => {
    renderRegisteredPanel(params);

    await waitFor(() => {
      expect(GraphGroupedNodePreviewPanel).toHaveBeenCalled();
    });

    expect(useGraphTelemetry).toHaveBeenCalledWith('entity_data_grid');
    expect(jest.mocked(GraphGroupedNodePreviewPanel).mock.calls[0][0].onTelemetryEvent).toBe(
      mockOnTelemetryEvent
    );
  });

  it('does not pass the entry point on to the panel itself', async () => {
    renderRegisteredPanel({ ...params, entryPoint: 'alert_flyout' });

    await waitFor(() => {
      expect(GraphGroupedNodePreviewPanel).toHaveBeenCalled();
    });

    expect(useGraphTelemetry).toHaveBeenCalledWith('alert_flyout');
    expect(jest.mocked(GraphGroupedNodePreviewPanel).mock.calls[0][0]).not.toHaveProperty(
      'entryPoint'
    );
  });

  it('renders the panel without telemetry when the restored params have no entry point', async () => {
    const { entryPoint, ...paramsWithoutEntryPoint } = params;

    renderRegisteredPanel(paramsWithoutEntryPoint);

    await waitFor(() => {
      expect(GraphGroupedNodePreviewPanel).toHaveBeenCalled();
    });

    const [panelProps] = jest.mocked(GraphGroupedNodePreviewPanel).mock.calls[0];
    expect(panelProps.onTelemetryEvent).toBeUndefined();
    expect(panelProps).not.toHaveProperty('entryPoint');
    expect(useGraphTelemetry).not.toHaveBeenCalled();
  });
});
