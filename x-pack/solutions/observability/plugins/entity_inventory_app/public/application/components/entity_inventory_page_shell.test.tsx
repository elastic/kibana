/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import type { EntityInventoryEntityCategory } from '../../types';
import { useEntityInventorySearch } from '../context/entity_inventory_search_context';
import { EntityInventoryPageShell } from './entity_inventory_page_shell';

const renderWithServices = (ui: React.ReactElement) => {
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  unifiedSearch.ui.SearchBar = () => <div data-test-subj="mockSearchBar" />;

  return render(
    <KibanaContextProvider services={{ ...coreMock.createStart(), unifiedSearch }}>
      {ui}
    </KibanaContextProvider>
  );
};

const EntityCategoryReader = () => {
  const { entityCategory } = useEntityInventorySearch();
  return <span data-test-subj="entityCategoryReader">{entityCategory}</span>;
};

describe('EntityInventoryPageShell', () => {
  it('renders the search bar, secondary controls and content slot', () => {
    renderWithServices(
      <EntityInventoryPageShell
        entityCategory="all"
        secondaryControls={<div data-test-subj="secondaryControl" />}
      >
        <div data-test-subj="slotContent" />
      </EntityInventoryPageShell>
    );

    expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('entityInventorySecondaryControls')).getByTestId('secondaryControl')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('entityInventoryPageContent')).getByTestId('slotContent')
    ).toBeInTheDocument();
  });

  it('omits the secondary controls row when none are provided', () => {
    renderWithServices(<EntityInventoryPageShell entityCategory="all" />);

    expect(screen.queryByTestId('entityInventorySecondaryControls')).not.toBeInTheDocument();
  });

  it.each(['all', 'hosts', 'kubernetes'] as EntityInventoryEntityCategory[])(
    'renders for the %s entity category and exposes it to content via context',
    (entityCategory) => {
      renderWithServices(
        <EntityInventoryPageShell entityCategory={entityCategory}>
          <EntityCategoryReader />
        </EntityInventoryPageShell>
      );

      expect(screen.getByTestId('entityInventoryPageShell')).toHaveAttribute(
        'data-entity-category',
        entityCategory
      );
      expect(screen.getByTestId('entityCategoryReader')).toHaveTextContent(entityCategory);
    }
  );
});
