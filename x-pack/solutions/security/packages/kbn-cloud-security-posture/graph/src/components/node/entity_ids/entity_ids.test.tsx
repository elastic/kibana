/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestProviders } from '../../mock/test_providers';
import { EntityIds } from './entity_ids';
import {
  GRAPH_ENTITY_IDS_VALUE_ID,
  GRAPH_ENTITY_IDS_PLUS_COUNT_BUTTON_ID,
  GRAPH_ENTITY_IDS_PLUS_COUNT_ID,
} from '../../test_ids';

describe('EntityIds', () => {
  it('renders nothing when there are no entity ids', () => {
    const { container } = render(
      <TestProviders>
        <EntityIds entityIds={[]} />
      </TestProviders>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the first entity id and no counter for a single id', () => {
    render(
      <TestProviders>
        <EntityIds entityIds={['john.doe']} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_IDS_VALUE_ID)).toHaveTextContent('john.doe');
    expect(screen.queryByTestId(GRAPH_ENTITY_IDS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(GRAPH_ENTITY_IDS_PLUS_COUNT_ID)).not.toBeInTheDocument();
  });

  it('renders a clickable +N counter for multiple ids and fires the handler', () => {
    const onEntityIdClick = jest.fn();
    render(
      <TestProviders>
        <EntityIds
          entityIds={['john.doe', 'jane.roe', 'sam.poe']}
          onEntityIdClick={onEntityIdClick}
        />
      </TestProviders>
    );
    const counter = screen.getByTestId(GRAPH_ENTITY_IDS_PLUS_COUNT_BUTTON_ID);
    expect(counter).toHaveTextContent('+2');
    fireEvent.click(counter);
    expect(onEntityIdClick).toHaveBeenCalledTimes(1);
  });

  it('renders a static +N counter when no click handler is provided', () => {
    render(
      <TestProviders>
        <EntityIds entityIds={['john.doe', 'jane.roe']} />
      </TestProviders>
    );
    expect(screen.getByTestId(GRAPH_ENTITY_IDS_PLUS_COUNT_ID)).toHaveTextContent('+1');
    expect(screen.queryByTestId(GRAPH_ENTITY_IDS_PLUS_COUNT_BUTTON_ID)).not.toBeInTheDocument();
  });
});
