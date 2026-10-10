/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG } from '../../../../../common/constants';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { TestProviders } from '../../../../common/mock';
import type { StartServices } from '../../../../types';
import { EntitySourceBadge } from './entity_source_badge';

const renderBadge = (newEntityAnalyticsPage: boolean, resolvedFromCount?: number) => {
  const startServices = createStartServicesMock();
  jest
    .mocked(startServices.featureFlags.useBooleanValue)
    .mockImplementation((flag, fallback) =>
      flag === USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG ? newEntityAnalyticsPage : fallback
    );

  return render(
    <TestProviders startServices={startServices as StartServices}>
      <EntitySourceBadge
        isEntityInStore
        hasLastSeenDate
        resolvedFromCount={resolvedFromCount}
        data-test-subj="entity-source-badge"
      />
    </TestProviders>
  );
};

describe('EntitySourceBadge', () => {
  it('keeps Entity Store when the new entity analytics page flag is off', () => {
    const { getByTestId } = renderBadge(false, 3);

    expect(getByTestId('entity-source-badge')).toHaveTextContent('Entity Store');
    expect(
      getByTestId('entity-source-badge').querySelector('[data-euiicon-type="aggregate"]')
    ).not.toBeInTheDocument();
  });

  it('keeps Entity Store for an individual record when the flag is on', () => {
    const { getByTestId } = renderBadge(true, undefined);

    expect(getByTestId('entity-source-badge')).toHaveTextContent('Entity Store');
  });

  it('shows Resolved from N records with the aggregate icon when the flag is on', () => {
    const { getByTestId } = renderBadge(true, 3);
    const badge = getByTestId('entity-source-badge');

    expect(badge).toHaveTextContent('Resolved from 3 records');
    expect(badge.querySelector('[data-euiicon-type="aggregate"]')).toBeInTheDocument();
  });

  it('uses the singular record label', () => {
    const { getByTestId } = renderBadge(true, 1);

    expect(getByTestId('entity-source-badge')).toHaveTextContent('Resolved from 1 record');
  });
});
