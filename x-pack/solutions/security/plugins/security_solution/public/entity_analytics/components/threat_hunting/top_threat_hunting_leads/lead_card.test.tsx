/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { LeadCard } from './lead_card';
import type { HuntingLead } from './types';

vi.mock('@kbn/expandable-flyout', () => {
      const mocked = {
      useExpandableFlyoutApi: () => ({ openFlyout: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => {
      const mocked = {
      useIsNewFlyoutEnabled: () => false,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../flyout_v2/use_flyout_api', () => {
      const mocked = {
      useFlyoutApi: () => ({ openEntityFlyout: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

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
    render(<LeadCard lead={createMockLead({ origin: 'observations' })} onClick={vi.fn()} />, {
      wrapper: I18nProvider,
    });
    expect(screen.queryByTestId('leadExploratoryBadge')).not.toBeInTheDocument();
  });

  it('renders the exploratory badge for an exploratory-origin lead', () => {
    render(<LeadCard lead={createMockLead({ origin: 'exploratory' })} onClick={vi.fn()} />, {
      wrapper: I18nProvider,
    });
    expect(screen.getByTestId('leadExploratoryBadge')).toBeInTheDocument();
  });
});
