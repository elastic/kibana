/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { typesFixture as types } from './__fixtures__/types';
import { EntityInventoryFilterControls } from './entity_inventory_filter_controls';

jest.mock('./use_attribute_values', () => ({
  useAttributeValues: () => ({ values: ['one', 'two'], invalidSelections: [], isLoading: false }),
}));

const CATEGORY_FILTER = 'entityInventoryCategoryFilter';
const TYPE_FILTER = 'entityInventoryTypeFilter';
const CLEAR_FILTERS = 'entityInventoryClearFilters';
const attributeFilter = (attribute: string) => `entityInventoryAttributeFilter-${attribute}`;

const renderControls = (
  props: Partial<React.ComponentProps<typeof EntityInventoryFilterControls>> = {}
) => {
  const onSelectionChange = jest.fn();
  render(
    <EntityInventoryFilterControls
      typeDefinitions={types}
      timeRange={{ from: 'now-15m', to: 'now' }}
      selection={{ attributes: {} }}
      onSelectionChange={onSelectionChange}
      {...props}
    />
  );
  return { onSelectionChange };
};

describe('EntityInventoryFilterControls', () => {
  it('shows only the category filter at first', () => {
    renderControls();

    expect(screen.getByTestId(CATEGORY_FILTER)).toHaveTextContent('All categories');
    expect(screen.queryByTestId(TYPE_FILTER)).not.toBeInTheDocument();
    expect(screen.queryByTestId(attributeFilter('os.type'))).not.toBeInTheDocument();
  });

  it('shows the type filter and the attribute filters of any type once a category is selected', () => {
    renderControls({ selection: { category: 'kubernetes', attributes: {} } });

    expect(screen.getByTestId(TYPE_FILTER)).toHaveTextContent('All types');
    expect(screen.getByTestId(attributeFilter('k8s.cluster.name'))).toBeInTheDocument();
    expect(screen.getByTestId(attributeFilter('k8s.namespace.name'))).toBeInTheDocument();
    expect(screen.getByTestId(attributeFilter('cloud.provider'))).toBeInTheDocument();
    expect(screen.queryByTestId(attributeFilter('os.type'))).not.toBeInTheDocument();
  });

  it('shows the attribute filters of a type once it is selected', () => {
    renderControls({ selection: { category: 'kubernetes', type: 'k8s.pod', attributes: {} } });

    expect(screen.getByTestId(TYPE_FILTER)).toHaveTextContent('Pod');
    expect(screen.getByTestId(attributeFilter('k8s.pod.phase'))).toBeInTheDocument();
  });

  it('hides the category filter on a page with a category', () => {
    renderControls({ pageCategory: 'hosts' });

    expect(screen.queryByTestId(CATEGORY_FILTER)).not.toBeInTheDocument();
    expect(screen.queryByTestId(TYPE_FILTER)).not.toBeInTheDocument();
    expect(screen.getByTestId(attributeFilter('os.type'))).toBeInTheDocument();
    expect(screen.getByTestId(attributeFilter('cloud.provider'))).toBeInTheDocument();
  });

  it('reports the selected category', async () => {
    const { onSelectionChange } = renderControls();

    await userEvent.click(screen.getByTestId(CATEGORY_FILTER));
    await userEvent.click(screen.getByRole('option', { name: 'Kubernetes' }));

    expect(onSelectionChange).toHaveBeenCalledWith({
      category: 'kubernetes',
      type: undefined,
      attributes: {},
    });
  });

  it('clears the selections of filters that are no longer shown when the category changes', async () => {
    const { onSelectionChange } = renderControls({
      selection: { category: 'hosts', attributes: { 'os.type': ['linux'] } },
    });

    await userEvent.click(screen.getByTestId(CATEGORY_FILTER));
    await userEvent.click(screen.getByRole('option', { name: 'Kubernetes' }));

    expect(onSelectionChange).toHaveBeenCalledWith({
      category: 'kubernetes',
      type: undefined,
      attributes: {},
    });
  });

  it('removes an attribute from the selection when its last value is cleared', async () => {
    const { onSelectionChange } = renderControls({
      selection: { category: 'hosts', attributes: { 'os.type': ['one'] } },
    });

    await userEvent.click(screen.getByTestId(attributeFilter('os.type')));
    await userEvent.click(screen.getByRole('option', { name: 'one' }));

    expect(onSelectionChange).toHaveBeenCalledWith({
      category: 'hosts',
      type: undefined,
      attributes: {},
    });
  });

  it('reports the selected values of an attribute filter', async () => {
    const { onSelectionChange } = renderControls({
      selection: { category: 'hosts', attributes: {} },
    });

    await userEvent.click(screen.getByTestId(attributeFilter('os.type')));
    await userEvent.click(screen.getByRole('option', { name: 'two' }));

    expect(onSelectionChange).toHaveBeenCalledWith({
      category: 'hosts',
      type: undefined,
      attributes: { 'os.type': ['two'] },
    });
  });

  it('shows a disabled loading filter instead of nothing while the types load', () => {
    renderControls({ typeDefinitions: [], isLoading: true });

    expect(screen.getByTestId('entityInventoryFilterControlsLoading')).toBeDisabled();
    expect(screen.queryByTestId(CATEGORY_FILTER)).not.toBeInTheDocument();
  });

  it('shows the loading filter as the Type filter on a page with a category', () => {
    renderControls({ typeDefinitions: [], isLoading: true, pageCategory: 'hosts' });

    expect(screen.getByTestId('entityInventoryFilterControlsLoading')).toHaveTextContent(
      'All types'
    );
  });

  it('shows the clear filters action only when a filter is selected', () => {
    renderControls();

    expect(screen.queryByTestId(CLEAR_FILTERS)).not.toBeInTheDocument();
  });

  it('clears every selected filter', async () => {
    const { onSelectionChange } = renderControls({
      selection: { category: 'hosts', attributes: { 'os.type': ['linux'] } },
    });

    await userEvent.click(screen.getByTestId(CLEAR_FILTERS));

    expect(onSelectionChange).toHaveBeenCalledWith({ attributes: {} });
  });

  it('shows an error instead of the filters when the types could not be loaded', () => {
    renderControls({ typeDefinitions: [], error: new Error('failed') });

    expect(screen.getByText('The filters could not be loaded')).toBeInTheDocument();
    expect(screen.queryByTestId(CATEGORY_FILTER)).not.toBeInTheDocument();
  });
});
