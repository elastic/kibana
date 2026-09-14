/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../mock/test_providers';
import { EntityNodeDetailed } from './entity_node_detailed';
import type { EntityNodeViewModel } from '../../types';
import {
  GRAPH_ENTITY_NODE_CARD_ID,
  GRAPH_ENTITY_NODE_METADATA_ID,
  GRAPH_STACKED_SHAPE_ID,
} from '../../test_ids';

const baseData: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Entity name',
  color: 'primary',
  shape: 'rectangle',
  icon: 'user',
  entityType: 'user',
};

describe('EntityNodeDetailed', () => {
  it('renders the card with name and type', () => {
    render(
      <TestProviders>
        <EntityNodeDetailed data={baseData} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_CARD_ID)).toBeInTheDocument();
    expect(screen.getByText('Entity name')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('renders the metadata section by default', () => {
    render(
      <TestProviders>
        <EntityNodeDetailed data={{ ...baseData, entityIds: ['john.doe'] }} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_METADATA_ID)).toBeInTheDocument();
  });

  it('hides the metadata section when showMetadata is false', () => {
    render(
      <TestProviders>
        <EntityNodeDetailed data={{ ...baseData, entityIds: ['john.doe'], showMetadata: false }} />
      </TestProviders>
    );
    expect(screen.queryByTestId(GRAPH_ENTITY_NODE_METADATA_ID)).not.toBeInTheDocument();
  });

  it('renders the stacked-card effect for a grouped node (count > 1)', () => {
    render(
      <TestProviders>
        <EntityNodeDetailed data={{ ...baseData, count: 5 }} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_STACKED_SHAPE_ID)).toBeInTheDocument();
  });

  it('does not render the stacked-card effect for a single node', () => {
    render(
      <TestProviders>
        <EntityNodeDetailed data={{ ...baseData, count: 1 }} />
      </TestProviders>
    );
    expect(screen.queryByTestId(GRAPH_STACKED_SHAPE_ID)).not.toBeInTheDocument();
  });
});
