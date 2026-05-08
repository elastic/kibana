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
import { useEntityForAttachment, type EntityForAttachment } from '../use_entity_for_attachment';
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
  RiskSummaryMini: (props: Record<string, unknown>) => {
    const riskStats = props.riskStats as Record<string, unknown> | undefined;
    const resolutionRiskStats = props.resolutionRiskStats as Record<string, unknown> | undefined;
    return (
      <div
        data-test-subj="riskSummaryMiniMock"
        data-has-stats={String(Boolean(riskStats))}
        data-primary-cat1-score={String(riskStats?.category_1_score ?? '')}
        data-primary-cat1-count={String(riskStats?.category_1_count ?? '')}
        data-has-resolution-stats={String(Boolean(resolutionRiskStats))}
        data-resolution-score={String(props.resolutionRiskScore ?? '')}
        data-resolution-level={String(props.resolutionRiskLevel ?? '')}
        data-resolution-cat1-score={String(resolutionRiskStats?.category_1_score ?? '')}
      />
    );
  },
}));

const mockedUseEntityForAttachment = useEntityForAttachment as jest.Mock;

const baseEntity = (override: Partial<EntityForAttachment> = {}): EntityForAttachment => ({
  entityType: EntityType.user,
  displayName: 'bob',
  entityId: 'entity-id-123',
  isEntityInStore: true,
  firstSeen: null,
  lastSeen: '2024-01-01T00:00:00Z',
  timestamp: '2024-01-01T00:00:00Z',
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

  it('forwards the attachment identifier (including entityStoreId) to useEntityForAttachment', () => {
    mockedUseEntityForAttachment.mockReturnValue({
      isLoading: false,
      data: baseEntity(),
    });

    const identifier = {
      identifierType: 'user' as const,
      identifier: "Lena Medhurst@Lena's MacBook Pro",
      entityStoreId: "user:Lena Medhurst@Lena's MacBook Pro@local",
    };
    renderCard({ identifier });

    expect(mockedUseEntityForAttachment).toHaveBeenCalledWith(identifier);
  });

  describe('attachment-supplied risk stats', () => {
    const attachmentRiskStats: React.ComponentProps<typeof EntityCard>['riskStats'] = {
      '@timestamp': '2024-02-02T00:00:00Z',
      id_field: 'user.name',
      id_value: 'bob',
      calculated_level: 'High',
      calculated_score: 70,
      calculated_score_norm: 88,
      category_1_score: 55.5,
      category_1_count: 7,
      category_2_score: 12,
      notes: [],
    };

    const attachmentResolutionRiskStats: React.ComponentProps<
      typeof EntityCard
    >['resolutionRiskStats'] = {
      '@timestamp': '2024-02-02T01:00:00Z',
      id_field: 'user.name',
      id_value: 'bob',
      calculated_level: 'Critical',
      calculated_score: 90,
      calculated_score_norm: 95,
      category_1_score: 80,
      category_1_count: 11,
      notes: [],
    };

    it('prefers attachment-supplied stats over entity-store stats', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        isLoading: false,
        data: baseEntity(),
      });
      renderCard({ riskStats: attachmentRiskStats });

      const mini = screen.getByTestId('riskSummaryMiniMock');
      expect(mini.getAttribute('data-primary-cat1-score')).toBe('55.5');
      expect(mini.getAttribute('data-primary-cat1-count')).toBe('7');
    });

    it('falls back to entity-store stats when no attachment stats are supplied', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        isLoading: false,
        data: baseEntity(),
      });
      renderCard();

      const mini = screen.getByTestId('riskSummaryMiniMock');
      // baseEntity's category_1_score/count from the fixture
      expect(mini.getAttribute('data-primary-cat1-score')).toBe('40');
      expect(mini.getAttribute('data-primary-cat1-count')).toBe('3');
    });

    it('passes resolution stats through to RiskSummaryMini so the resolution block renders', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        isLoading: false,
        data: baseEntity(),
      });
      renderCard({
        riskStats: attachmentRiskStats,
        resolutionRiskStats: attachmentResolutionRiskStats,
      });

      const mini = screen.getByTestId('riskSummaryMiniMock');
      expect(mini.getAttribute('data-has-resolution-stats')).toBe('true');
      expect(mini.getAttribute('data-resolution-score')).toBe('95');
      expect(mini.getAttribute('data-resolution-level')).toBe('Critical');
      expect(mini.getAttribute('data-resolution-cat1-score')).toBe('80');
    });

    it('renders the risk summary when only attachment stats are present and the store has no score', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        isLoading: false,
        data: baseEntity({
          riskStats: undefined,
          riskScore: undefined,
          riskLevel: undefined,
        }),
      });
      renderCard({ riskStats: attachmentRiskStats });

      expect(screen.getByTestId('riskSummaryMiniMock')).toBeInTheDocument();
    });

    it('renders the risk summary when only resolution stats are present', () => {
      mockedUseEntityForAttachment.mockReturnValue({
        isLoading: false,
        data: baseEntity({
          riskStats: undefined,
          riskScore: undefined,
          riskLevel: undefined,
        }),
      });
      renderCard({ resolutionRiskStats: attachmentResolutionRiskStats });

      const mini = screen.getByTestId('riskSummaryMiniMock');
      expect(mini).toBeInTheDocument();
      expect(mini.getAttribute('data-has-resolution-stats')).toBe('true');
      expect(mini.getAttribute('data-resolution-score')).toBe('95');
    });
  });
});
