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
import { EntityNodeSimplified } from './entity_node_simplified';
import type { EntityNodeViewModel } from '../../types';
import { GRAPH_ENTITY_NODE_SIMPLIFIED_ID, GRAPH_ENTITY_NODE_ICON_ID } from '../../test_ids';

const data: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Entity name',
  color: 'primary',
  shape: 'rectangle',
  icon: 'user',
};

describe('EntityNodeSimplified', () => {
  it('renders the icon tile', () => {
    render(
      <TestProviders>
        <EntityNodeSimplified data={data} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_SIMPLIFIED_ID)).toBeInTheDocument();
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_ICON_ID)).toBeInTheDocument();
  });

  it('renders the count badge when grouped', () => {
    render(
      <TestProviders>
        <EntityNodeSimplified data={{ ...data, count: 5 }} />
      </TestProviders>
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
