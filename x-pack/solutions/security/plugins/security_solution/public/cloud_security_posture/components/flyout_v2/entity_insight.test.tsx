/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EntityInsight } from './entity_insight';

jest.mock('../entity_insight', () => ({
  EntityInsight: jest.fn(() => <div data-test-subj="base-entity-insight" />),
}));

import { EntityInsight as EntityInsightBase } from '../entity_insight';

describe('EntityInsight (flyout v2 wrapper)', () => {
  const openDetailsPanel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 EntityInsight with isPreviewMode enabled and forwards props', () => {
    const { getByTestId } = render(
      <EntityInsight
        identityFields={{ 'host.name': 'my-host' }}
        openDetailsPanel={openDetailsPanel}
        entityType="host"
      />
    );

    expect(getByTestId('base-entity-insight')).toBeInTheDocument();

    const props = (EntityInsightBase as jest.Mock).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        identityFields: { 'host.name': 'my-host' },
        openDetailsPanel,
        entityType: 'host',
        isPreviewMode: true,
      })
    );
  });
});
