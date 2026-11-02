/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { LeadCard } from './lead_card';
import type { HuntingLead } from './types';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));

jest.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => false,
}));

jest.mock('../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openEntityFlyout: jest.fn() }),
}));

const createMockLead = (overrides: Partial<HuntingLead> = {}): HuntingLead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'Test byline',
  description: 'Test description',
  entity: { type: 'user', name: 'jsmith', id: 'user:jsmith' },
  tags: [],
  priority: 8,
  chatRecommendations: [],
  timestamp: '2026-03-01T00:00:00.000Z',
  staleness: 'fresh',
  status: 'active',
  observations: [],
  sourceType: 'adhoc',
  topRelatedEntities: [],
  relatedEntityCounts: {},
  origin: 'observations',
  ...overrides,
});

describe('LeadCard', () => {
  it('does not render the exploratory badge for an observations-origin lead', () => {
    render(<LeadCard lead={createMockLead({ origin: 'observations' })} onClick={jest.fn()} />, {
      wrapper: I18nProvider,
    });
    expect(screen.queryByTestId('leadExploratoryBadge')).not.toBeInTheDocument();
  });

  it('renders the exploratory badge for an exploratory-origin lead', () => {
    render(<LeadCard lead={createMockLead({ origin: 'exploratory' })} onClick={jest.fn()} />, {
      wrapper: I18nProvider,
    });
    expect(screen.getByTestId('leadExploratoryBadge')).toBeInTheDocument();
  });
});
