/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import { FILTERS } from '@kbn/es-query';
import { ALL_LOGS_DATA_VIEW_ID } from '@kbn/discover-utils/src';
import { DiscoverRedirect } from './redirect_to_discover';

describe('DiscoverRedirect', () => {
  const navigate = jest.fn();
  const discover = { locator: { navigate } } as unknown as DiscoverStart;

  const renderRedirect = (pageState: string) =>
    render(
      <MemoryRouter initialEntries={[`/?pageState=${pageState}`]}>
        <DiscoverRedirect core={{} as CoreStart} discover={discover} />
      </MemoryRouter>
    );

  const getNavigatedFilters = () => navigate.mock.calls[0][0].filters;

  const namespaceControl = (mode: string, selection: string) =>
    `(controls:(namespace:(mode:${mode},selection:${selection})),dataSourceSelection:(selectionType:all),v:2)`;

  beforeEach(() => {
    navigate.mockClear();
  });

  it('converts an include namespace control into a phrases filter', () => {
    renderRedirect(
      '(controls:(namespace:(mode:include,selection:(type:options,selectedOptions:!(staging)))))'
    );

    const filters = getNavigatedFilters();
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.type).toBe(FILTERS.PHRASES);
    expect(filters[0].meta.key).toBe('data_stream.namespace');
    expect(filters[0].meta.params).toEqual(['staging']);
    expect(filters[0].meta.negate).toBeFalsy();
    expect(filters[0].meta.index).toBe(ALL_LOGS_DATA_VIEW_ID);
  });

  it('negates the filter for an exclude namespace control', () => {
    renderRedirect(namespaceControl('exclude', '(type:options,selectedOptions:!(staging))'));

    const filters = getNavigatedFilters();
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.negate).toBe(true);
  });

  it('converts an exists namespace selection into an exists filter', () => {
    renderRedirect(namespaceControl('include', '(type:exists)'));

    const filters = getNavigatedFilters();
    expect(filters).toHaveLength(1);
    expect(filters[0].meta.type).toBe(FILTERS.EXISTS);
    expect(filters[0].meta.key).toBe('data_stream.namespace');
  });

  it('keeps existing filters before the namespace filter', () => {
    renderRedirect(
      '(controls:(namespace:(mode:include,selection:(type:options,selectedOptions:!(staging)))),filters:!((meta:(key:host.name,type:phrase),query:(match_phrase:(host.name:foo)))))'
    );

    const filters = getNavigatedFilters();
    expect(filters).toHaveLength(2);
    expect(filters[0].meta.key).toBe('host.name');
    expect(filters[1].meta.key).toBe('data_stream.namespace');
  });

  it('produces no filters when the URL has no controls', () => {
    renderRedirect('(dataSourceSelection:(selectionType:all),v:2)');

    expect(getNavigatedFilters()).toEqual([]);
  });
});
