/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { EntitySourceBadge } from './entity_source_badge';

const renderBadge = ({
  isEntityInStore = true,
  hasLastSeenDate = true,
  resolvedFromCount,
}: {
  isEntityInStore?: boolean;
  hasLastSeenDate?: boolean;
  resolvedFromCount?: number;
} = {}) =>
  render(
    <TestProviders>
      <EntitySourceBadge
        isEntityInStore={isEntityInStore}
        hasLastSeenDate={hasLastSeenDate}
        resolvedFromCount={resolvedFromCount}
        data-test-subj="entity-source-badge"
      />
    </TestProviders>
  );

describe('EntitySourceBadge', () => {
  it('renders nothing when the entity is neither in the store nor observed', () => {
    const { queryByTestId } = renderBadge({ isEntityInStore: false, hasLastSeenDate: false });

    expect(queryByTestId('entity-source-badge')).not.toBeInTheDocument();
  });

  it('shows Observed for an entity that is not in the store', () => {
    const { getByTestId } = renderBadge({ isEntityInStore: false });

    expect(getByTestId('entity-source-badge')).toHaveTextContent('Observed');
  });

  it('shows Entity Store for an individual record', () => {
    const { getByTestId } = renderBadge();

    expect(getByTestId('entity-source-badge')).toHaveTextContent('Entity Store');
    expect(
      getByTestId('entity-source-badge').querySelector('[data-euiicon-type="aggregate"]')
    ).not.toBeInTheDocument();
  });

  it('shows Resolved from N records with the aggregate icon when resolvedFromCount is provided', () => {
    const { getByTestId } = renderBadge({ resolvedFromCount: 3 });
    const badge = getByTestId('entity-source-badge');

    expect(badge).toHaveTextContent('Resolved from 3 records');
    expect(badge.querySelector('[data-euiicon-type="aggregate"]')).toBeInTheDocument();
  });

  it('uses the singular record label', () => {
    const { getByTestId } = renderBadge({ resolvedFromCount: 1 });

    expect(getByTestId('entity-source-badge')).toHaveTextContent('Resolved from 1 record');
  });

  it('ignores resolvedFromCount for an entity that is not in the store', () => {
    const { getByTestId } = renderBadge({ isEntityInStore: false, resolvedFromCount: 3 });

    expect(getByTestId('entity-source-badge')).toHaveTextContent('Observed');
  });
});
