/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { GraphView } from '.';
import { GRAPH_VIEW_SUB_TABS_TEST_ID } from './graph_view_sub_tabs';
import { BLAST_RADIUS_TAB_TEST_ID } from './blast_radius/test_ids';

jest.mock('../../../../shared/components/tools_flyout_header', () => ({
  ToolsFlyoutHeader: ({ title, label }: { title: string; label?: string }) => (
    <div data-test-subj="mockToolsFlyoutHeader" data-title={title} data-label={label} />
  ),
}));

jest.mock('../../../../document/tools/graph/components/graph_visualization', () => ({
  GraphVisualization: ({ mode, entityId }: { mode: string; entityId: string }) => (
    <div data-test-subj="mockGraphVisualization" data-mode={mode} data-entity-id={entityId} />
  ),
}));

jest.mock('./blast_radius', () => ({
  BlastRadiusSubTab: ({ entityId }: { entityId: string }) => (
    <div data-test-subj="mockBlastRadiusSubTab" data-entity-id={entityId} />
  ),
}));

jest.mock('../../../../shared/hooks/use_open_flyout', () => ({
  useOpenFlyout: () => jest.fn(),
}));
jest.mock('../../../../shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: () => ({}),
}));
jest.mock('../../../../session_context', () => ({
  useFlyoutSessionContext: () => ({ historyKey: 'history' }),
}));
jest.mock('../../../../use_flyout_api', () => ({
  useFlyoutApi: () => ({
    openDocumentFlyoutFromIndexAsChild: jest.fn(),
    openNetworkFlyoutAsChild: jest.fn(),
  }),
}));

const ENTITY_ID = 'user:john.doe@acmecrm.com@okta';

const renderGraphView = () =>
  render(
    <GraphView
      entityId={ENTITY_ID}
      scopeId="scope"
      entityName="john.doe"
      onShowEntity={jest.fn()}
    />
  );

describe('<GraphView />', () => {
  it('shows the entity graph by default', () => {
    renderGraphView();

    expect(screen.getByTestId('mockToolsFlyoutHeader')).toHaveAttribute('data-label', 'john.doe');
    expect(screen.getByTestId('mockGraphVisualization')).toHaveAttribute('data-mode', 'entity');
    expect(screen.queryByTestId('mockBlastRadiusSubTab')).not.toBeInTheDocument();
  });

  it('switches to the blast radius for the same entity', () => {
    renderGraphView();

    const subTabs = screen.getByTestId(GRAPH_VIEW_SUB_TABS_TEST_ID);
    fireEvent.click(subTabs.querySelector('[data-text="Blast radius"]') as Element);

    expect(screen.getByTestId('mockBlastRadiusSubTab')).toHaveAttribute(
      'data-entity-id',
      ENTITY_ID
    );
    expect(screen.queryByTestId('mockGraphVisualization')).not.toBeInTheDocument();
    expect(screen.queryByTestId(BLAST_RADIUS_TAB_TEST_ID)).not.toBeInTheDocument();
  });
});
