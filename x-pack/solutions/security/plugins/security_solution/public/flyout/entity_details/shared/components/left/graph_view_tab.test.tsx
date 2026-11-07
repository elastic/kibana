/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { GraphGroupedNodePreviewPanelKey } from '@kbn/cloud-security-posture-graph';
import { GraphVisualization } from '../../../../../flyout_v2/document/tools/graph/components/graph_visualization';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../../../../entity_analytics/components/home/constants';
import { mockFlyoutApi } from '../../../../document_details/shared/mocks/mock_flyout_context';
import { GraphViewTab } from './graph_view_tab';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
}));

jest.mock('@kbn/cloud-security-posture-graph', () => {
  const { GraphGroupedNodePreviewPanelKey: key, GROUP_PREVIEW_BANNER } = jest.requireActual(
    '@kbn/cloud-security-posture-graph/src/components/graph_grouped_node_preview_panel/constants'
  );
  return {
    GraphGroupedNodePreviewPanelKey: key,
    GROUP_PREVIEW_BANNER,
    NETWORK_PREVIEW_BANNER: {},
  };
});

jest.mock('../../../../../flyout_v2/document/tools/graph/components/graph_visualization', () => ({
  GraphVisualization: jest.fn(() => <div />),
}));

const openGroupedPanel = (scopeId: string) => {
  render(<GraphViewTab entityId="entity-id" scopeId={scopeId} />);
  const { onShowGrouped } = jest.mocked(GraphVisualization).mock.calls[0][0];
  onShowGrouped({
    docMode: 'grouped-entities',
    dataViewId: 'data-view-id',
    documentIds: [],
    entityItems: [],
    scopeId: 'graph-scope',
  });
};

describe('<GraphViewTab />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('puts the entity flyout entry point in the grouped panel params', () => {
    openGroupedPanel('some-flyout-scope');

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: GraphGroupedNodePreviewPanelKey,
      params: expect.objectContaining({ entryPoint: 'entity_flyout', docMode: 'grouped-entities' }),
    });
  });

  it('puts the entity flyout entry point in the grouped panel params for the entities table scope too', () => {
    openGroupedPanel(ENTITY_ANALYTICS_TABLE_ID);

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: GraphGroupedNodePreviewPanelKey,
      params: expect.objectContaining({ entryPoint: 'entity_flyout' }),
    });
  });
});
