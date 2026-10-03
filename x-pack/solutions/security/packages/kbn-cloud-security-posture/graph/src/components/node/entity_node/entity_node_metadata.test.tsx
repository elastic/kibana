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
import { EntityNodeMetadata } from './entity_node_metadata';
import {
  GRAPH_ENTITY_NODE_METADATA_ID,
  GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID,
  GRAPH_ENTITY_NODE_RISK_SCORE_ID,
  GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID,
} from '../../test_ids';

describe('EntityNodeMetadata', () => {
  it('renders the container', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata entityIds={['john.doe']} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_METADATA_ID)).toBeInTheDocument();
  });

  it('renders the entity id row when present', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata entityIds={['john.doe']} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID)).toHaveTextContent('john.doe');
  });

  it('omits the entity id row when absent', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata riskScore={{ value: 10 }} />
      </TestProviders>
    );
    expect(screen.queryByTestId(GRAPH_ENTITY_NODE_ENTITY_ID_ROW_ID)).not.toBeInTheDocument();
  });

  it('renders a single risk score value', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata riskScore={{ value: 90.01 }} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_RISK_SCORE_ID)).toHaveTextContent('90.01');
  });

  it('renders a min-max risk score', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata riskScore={{ min: 40.5, max: 90.01 }} />
      </TestProviders>
    );
    const el = screen.getByTestId(GRAPH_ENTITY_NODE_RISK_SCORE_ID);
    expect(el).toHaveTextContent('40.5');
    expect(el).toHaveTextContent('90.01');
  });

  it('renders asset criticality when present', () => {
    render(
      <TestProviders>
        <EntityNodeMetadata assetCriticality={{ high: 3, low: 2 }} />
      </TestProviders>
    );
    const el = screen.getByTestId(GRAPH_ENTITY_NODE_ASSET_CRITICALITY_ID);
    expect(el).toHaveTextContent('3');
    expect(el).toHaveTextContent('2');
  });
});
