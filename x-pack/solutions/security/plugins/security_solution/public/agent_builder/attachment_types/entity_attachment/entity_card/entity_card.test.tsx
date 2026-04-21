/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityForAttachment } from '../use_entity_for_attachment';
import { EntityCard } from './entity_card';

jest.mock('../use_entity_for_attachment', () => ({
  useEntityForAttachment: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: { application: { navigateToApp: jest.fn() } },
  }),
}));

jest.mock('./resolution_mini', () => ({
  ResolutionMini: (props: Record<string, unknown>) => (
    <div
      data-test-subj="resolutionMiniMock"
      data-has-entity-id={String(Boolean(props.entityStoreEntityId))}
    />
  ),
}));

jest.mock('./entity_summary_grid', () => ({
  EntitySummaryGridMini: (props: Record<string, unknown>) => (
    <div
      data-test-subj="entitySummaryGridMock"
      data-entity-id={String(props.entityId ?? '')}
      data-source={String(props.source ?? '')}
      data-watchlists-enabled={String(props.watchlistsEnabled)}
    />
  ),
}));

jest.mock('./risk_summary_mini', () => ({
  RiskSummaryMini: (props: Record<string, unknown>) => (
    <div
      data-test-subj="riskSummaryMiniMock"
      data-has-stats={String(Boolean(props.riskStats))}
    />
  ),
}));

const mockedUseEntityForAttachment =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../use_entity_for_attachment').useEntityForAttachment as jest.Mock;

const baseEntity = (override: Partial<EntityForAttachment> = {}): EntityForAttachment => ({
  entityType: EntityType.user,
  displayName: 'bob',
  entityId: 'entity-id-123',
  isEntityInStore: true,
  firstSeen: null,
  lastSeen: '2024-01-01T00:00:00Z',
  riskScore: 88,
  riskLevel: 'High',
  riskStats: {
    '@timestamp': '2024-01-01T00:00:00Z',
    id_field: 'user.name',
    id_value: 'bob',
    calculated_level: 'High',
    calculated_score: 50,
    calculated_score_norm: 88,
    category_1_score: 40,
    category_1_count: 3,
    category_2_score: 10,
    inputs: [],
    notes: [],
    rule_risks: [],
    multipliers: [],
  } as unknown as EntityForAttachment['riskStats'],
  assetCriticality: 'high_impact',
  watchlistIds: [],
  sources: ['okta'],
  ...override,
});

const renderCard = (props: Partial<React.ComponentProps<typeof EntityCard>> = {}) => {
  const defaults: React.ComponentProps<typeof EntityCard> = {
    identifier: { identifierType: 'user', identifier: 'bob' },
    watchlistsEnabled: true,
    privmonModifierEnabled: true,
  };
  return render(
    <I18nProvider>
      <EntityCard {...defaults} {...props} />
    </I18nProvider>
  );
};

describe('EntityCard', () => {
  beforeEach(() => {
    mockedUseEntityForAttachment.mockReset();
  });

  it('renders a skeleton while loading', () => {
    mockedUseEntityForAttachment.mockReturnValue({ isLoading: true, data: undefined });
    renderCard();
    expect(screen.getByTestId('entityAttachmentCardSkeleton')).toBeInTheDocument();
  });

  it('renders an error callout when the store fetch fails without data', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      isLoading: false,
      error: new Error('boom'),
      data: undefined,
    });
    renderCard();
    expect(screen.getByTestId('entityAttachmentCardError')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentCardActions')).toBeInTheDocument();
  });

  it('renders the rich layout for an entity that is in the store', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      isLoading: false,
      data: baseEntity(),
    });
    renderCard();

    expect(screen.getByTestId('entityAttachmentIdentityHeader')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentRiskLevelBadge')).toBeInTheDocument();
    expect(screen.getByTestId('entitySummaryGridMock')).toBeInTheDocument();
    expect(screen.getByTestId('riskSummaryMiniMock')).toBeInTheDocument();
    expect(screen.getByTestId('resolutionMiniMock')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentCardActions')).toBeInTheDocument();
  });

  it('does not render the rich sections when the entity is not in the store', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      isLoading: false,
      data: baseEntity({
        isEntityInStore: false,
        entityId: undefined,
        riskStats: undefined,
        riskScore: undefined,
        riskLevel: undefined,
      }),
    });
    renderCard();

    expect(screen.getByTestId('entityAttachmentIdentityHeader')).toBeInTheDocument();
    expect(screen.queryByTestId('entitySummaryGridMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('riskSummaryMiniMock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resolutionMiniMock')).not.toBeInTheDocument();
  });

  it('skips the risk summary when the store record has no risk data', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      isLoading: false,
      data: baseEntity({ riskStats: undefined, riskScore: undefined, riskLevel: undefined }),
    });
    renderCard();
    expect(screen.getByTestId('entitySummaryGridMock')).toBeInTheDocument();
    expect(screen.queryByTestId('riskSummaryMiniMock')).not.toBeInTheDocument();
  });

  it('passes the store entity id and watchlist flag to the summary grid', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      isLoading: false,
      data: baseEntity({ entityId: 'xyz-1', sources: ['crowdstrike'] }),
    });
    renderCard({ watchlistsEnabled: false });
    const grid = screen.getByTestId('entitySummaryGridMock');
    expect(grid.getAttribute('data-entity-id')).toBe('xyz-1');
    expect(grid.getAttribute('data-source')).toBe('crowdstrike');
    expect(grid.getAttribute('data-watchlists-enabled')).toBe('false');
  });

  it('omits the resolution mini section when there is no entity id', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      isLoading: false,
      data: baseEntity({ entityId: undefined }),
    });
    renderCard();
    expect(screen.queryByTestId('resolutionMiniMock')).not.toBeInTheDocument();
  });
});
