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
import { EntityIcon } from './entity_icon';
import { GRAPH_ENTITY_NODE_ICON_ID } from '../../test_ids';

describe('EntityIcon', () => {
  it('renders the icon tile', () => {
    render(
      <TestProviders>
        <EntityIcon icon="user" color="primary" />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_NODE_ICON_ID)).toBeInTheDocument();
  });

  it('renders a count badge when grouped', () => {
    render(
      <TestProviders>
        <EntityIcon icon="user" color="primary" count={5} />
      </TestProviders>
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render a count badge for a single entity', () => {
    render(
      <TestProviders>
        <EntityIcon icon="user" color="primary" count={1} />
      </TestProviders>
    );
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
