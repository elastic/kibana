/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { RelatedEntity } from './hooks/use_entity_relationships';
import { EMPTY_EDGE_CONTEXT } from './event_context';
import { entityNodeId } from './graph_state';
import { useIntelligenceEntityList } from './hooks/use_intelligence_entity_list';
import { EntityDossierPanel } from './entity_dossier_panel';
import { EntityInvestigationCanvas } from './entity_investigation_canvas';
import { RelationshipGraph } from './relationship_graph';
import { ExplorerTab } from './explorer_tab';

const mockResetExplain = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { agentBuilder: undefined } }),
}));
jest.mock('../../../common/hooks/use_navigate_to_alerts_page_with_filters', () => ({
  useNavigateToAlertsPageWithFilters: () => jest.fn(),
}));
jest.mock('./hooks/use_ai_explain', () => ({
  useAiExplain: () => ({
    explain: jest.fn(),
    result: undefined,
    rawResult: undefined,
    isGenerating: false,
    error: undefined,
    hasConnector: false,
    connectorName: undefined,
    reset: mockResetExplain,
  }),
}));
jest.mock('./hooks/use_intelligence_entity_list');
jest.mock('./entity_dossier_panel', () => ({ EntityDossierPanel: jest.fn(() => null) }));
jest.mock('./entity_investigation_canvas', () => ({
  EntityInvestigationCanvas: jest.fn(() => null),
}));
jest.mock('./relationship_graph', () => ({ RelationshipGraph: jest.fn(() => null) }));
jest.mock('./entity_timeline_panel', () => ({
  EntityTimelinePanel: () => <div data-test-subj="timelinePanel" />,
}));
jest.mock('./ai_explain_flyout', () => ({ AiExplainFlyout: () => null }));

const rootEntity: IntelligenceEntity = {
  id: 'user:google-subject@unknown',
  name: 'Requester',
  identifierValue: 'requester@example.com',
  type: EntityType.user,
  riskScoreNorm: 58.2,
  riskLevel: 'Moderate',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};
const relatedEntity: IntelligenceEntity = {
  ...rootEntity,
  id: 'user:other-subject@unknown',
  name: 'Related requester',
  identifierValue: 'related@example.com',
};
const relatedNode: RelatedEntity = {
  id: entityNodeId(EntityType.user, relatedEntity.identifierValue),
  name: relatedEntity.name,
  kind: EntityType.user,
  alertCount: 1,
  worstSeverity: 'high',
  context: EMPTY_EDGE_CONTEXT,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useIntelligenceEntityList).mockImplementation(({ perPage, filterQuery }) => {
    const entities =
      perPage === 1
        ? [filterQuery?.includes(relatedEntity.id) ? relatedEntity : rootEntity]
        : [rootEntity, relatedEntity];
    return {
      entities,
      total: entities.length,
      isLoading: false,
      isError: false,
      isRefreshing: false,
      refetch: jest.fn(),
    };
  });
  jest.mocked(EntityInvestigationCanvas).mockImplementation(({ entity, children }) => (
    <>
      {children({
        scope: { type: 'entity', entity },
        result: {
          findings: [],
          isLoading: false,
          isRefreshing: false,
          unavailable: false,
          partial: false,
          refetch: jest.fn(),
        },
        spaceId: 'default',
      })}
    </>
  ));
  jest.mocked(RelationshipGraph).mockImplementation(({ entity, onInspectEntity }) => (
    <div data-test-subj="relationshipGraph">
      <span data-test-subj="graphIdentity">{entity.id}</span>
      <button type="button" onClick={() => onInspectEntity(relatedNode)}>
        {'Inspect related identity'}
      </button>
    </div>
  ));
  jest.mocked(EntityDossierPanel).mockImplementation(({ entity, onShowAgentActivity }) => (
    <div data-test-subj="entityDossier">
      <span data-test-subj="dossierIdentity">{entity.id}</span>
      <button type="button" onClick={onShowAgentActivity}>
        {'Show agent activity'}
      </button>
    </div>
  ));
});

const expectAgentGraphFocus = (entity: IntelligenceEntity) => {
  expect(screen.getByTestId('graphIdentity')).toHaveTextContent(entity.id);
  expect(screen.queryByTestId('entityDossier')).not.toBeInTheDocument();
  expect(screen.queryByTestId('timelinePanel')).not.toBeInTheDocument();
  expect(jest.mocked(RelationshipGraph).mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({
      entity,
      agentActivityRequest: { entityId: entity.id, nonce: expect.any(Number) },
      isExternalDrawerOpen: false,
    })
  );
};

it('expands agent activity for the current identity while closing the compact dossier', () => {
  const onSelectEntity = jest.fn();
  render(
    <ExplorerTab
      initialEntity={rootEntity}
      entityId={rootEntity.id}
      onSelectEntity={onSelectEntity}
    />
  );
  expect(screen.getByTestId('dossierIdentity')).toHaveTextContent(rootEntity.id);
  expect(jest.mocked(EntityDossierPanel).mock.calls.at(-1)?.[0].compact).toBe(true);
  expect(jest.mocked(RelationshipGraph).mock.calls.at(-1)?.[0].isExternalDrawerOpen).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Show agent activity' }));
  expectAgentGraphFocus(rootEntity);
  expect(onSelectEntity).not.toHaveBeenCalled();
});

it('keeps the graph focused after the parent adopts a related identity and its URL selection', () => {
  const onSelectEntity = jest.fn();
  const Parent: React.FC = () => {
    const [selected, setSelected] = useState(rootEntity);
    return (
      <ExplorerTab
        initialEntity={selected}
        entityId={selected.id}
        onSelectEntity={(entity) => {
          onSelectEntity(entity);
          setSelected(entity);
        }}
      />
    );
  };
  render(<Parent />);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect related identity' }));
  expect(screen.getByTestId('graphIdentity')).toHaveTextContent(rootEntity.id);
  expect(screen.getByTestId('dossierIdentity')).toHaveTextContent(relatedEntity.id);
  fireEvent.click(screen.getByRole('button', { name: 'Show agent activity' }));
  expect(onSelectEntity).toHaveBeenCalledTimes(1);
  expect(onSelectEntity).toHaveBeenCalledWith(relatedEntity);
  expectAgentGraphFocus(relatedEntity);
});

it('preserves graph-only mode when a matching entity arrives through URL resolution', () => {
  const onSelectEntity = jest.fn();
  const { rerender } = render(
    <ExplorerTab
      initialEntity={rootEntity}
      entityId={rootEntity.id}
      onSelectEntity={onSelectEntity}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Inspect related identity' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show agent activity' }));
  expect(onSelectEntity).toHaveBeenCalledWith(relatedEntity);
  expectAgentGraphFocus(relatedEntity);
  rerender(
    <ExplorerTab
      initialEntity={undefined}
      entityId={relatedEntity.id}
      onSelectEntity={onSelectEntity}
    />
  );
  expectAgentGraphFocus(relatedEntity);
});
