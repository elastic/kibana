/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { GraphGroupedNodePreviewPanel } from '@kbn/cloud-security-posture-graph';
import { KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { TestProviders } from '../../../../../common/mock';
import { useFlyoutApi } from '../../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../../use_flyout_api.mock';
import { useOpenFlyout } from '../../../../shared/hooks/use_open_flyout';
import { useGraphTelemetry } from '../../../../shared/hooks/use_graph_telemetry';
import { GraphVisualization } from '../../../../document/tools/graph/components/graph_visualization';
import { GraphTab } from './graph_tab';

jest.mock('../../../../use_flyout_api');
jest.mock('../../../../shared/hooks/use_open_flyout');
jest.mock('../../../../shared/hooks/use_graph_telemetry');
jest.mock('../../../../document/tools/graph/components/graph_visualization', () => ({
  GraphVisualization: jest.fn(() => <div data-test-subj="mockGraphVisualization" />),
}));

const agentId = 'ai_agent:claude_code@host-1@ec2-user';
const relatedAgentId = 'ai_agent:claude_code@host-2@aquinn';

const mockOpen = jest.fn();
const mockOnTelemetryEvent = jest.fn();

const renderTab = (onShowAgent = jest.fn()) =>
  render(
    <TestProviders>
      <KibanaErrorBoundaryProvider analytics={undefined}>
        <GraphTab
          entityId={agentId}
          entityName="Claude Code · ec2-user@ci-build-01"
          scopeId="scope"
          onShowAgent={onShowAgent}
        />
      </KibanaErrorBoundaryProvider>
    </TestProviders>
  );

const graphProps = () => jest.mocked(GraphVisualization).mock.calls[0][0];

const openGroupedAgents = () => {
  graphProps().onShowGrouped({
    docMode: 'grouped-entities',
    scopeId: 'graph-scope',
    dataViewId: undefined,
    documentIds: [],
    entityItems: [],
  });
  return mockOpen.mock.calls[0];
};

describe('GraphTab', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useOpenFlyout).mockReturnValue(mockOpen);
    jest.mocked(useGraphTelemetry).mockReturnValue({
      onTelemetryEvent: mockOnTelemetryEvent,
      reportGraphPreviewShown: jest.fn(),
      reportGraphPreviewExpanded: jest.fn(),
      reportGraphOpened: jest.fn(),
      reportDrillThrough: jest.fn(),
    });
  });

  it('centres the entity graph on the agent', () => {
    renderTab();
    expect(graphProps()).toEqual(
      expect.objectContaining({ mode: 'entity', entityId: agentId, scopeId: 'scope' })
    );
  });

  it('opens a grouped node, such as the person’s other agents, as a child flyout', () => {
    renderTab();
    const [panel, properties, meta, session] = openGroupedAgents();

    expect(panel.type).toBe(GraphGroupedNodePreviewPanel);
    expect(panel.props).toEqual(
      expect.objectContaining({
        docMode: 'grouped-entities',
        scopeId: 'graph-scope',
        onTelemetryEvent: mockOnTelemetryEvent,
      })
    );
    expect(properties).toEqual(expect.objectContaining({ session: 'inherit' }));
    expect(meta).toEqual(
      expect.objectContaining({ surface: 'tool', tool: 'graph', origin: 'graph_grouped_node' })
    );
    expect(session).toBe('inherit');
  });

  it('opens an agent picked from the grouped panel as a child flyout', () => {
    renderTab();
    const [panel] = openGroupedAgents();

    panel.props.onShowEntity({
      engineType: 'ai_agent',
      entityId: relatedAgentId,
      entityName: 'claude_code@aquinn@dev-aquinn-01',
    });
    expect(flyoutApi.openEntityDetailsAsChild).toHaveBeenCalledWith(
      expect.objectContaining({
        engineType: 'ai_agent',
        entityId: relatedAgentId,
        scopeId: 'scope',
      })
    );
  });

  it('opens the full graph view centred on the agent', () => {
    renderTab();
    fireEvent.click(screen.getByText('Open graph view'));
    expect(flyoutApi.openEntityGraphView).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: agentId, scopeId: 'scope' })
    );
  });
});
