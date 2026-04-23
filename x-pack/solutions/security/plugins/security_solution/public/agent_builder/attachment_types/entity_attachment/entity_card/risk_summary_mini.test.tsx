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
import type { RiskStats } from '../../../../../common/search_strategy';
import { RiskSummaryMini } from './risk_summary_mini';

jest.mock('../../../../entity_analytics/components/severity/common', () => ({
  RiskScoreLevel: ({ severity }: { severity?: string }) => (
    <span data-test-subj="riskScoreLevelMock">{severity}</span>
  ),
}));

jest.mock('../../../../entity_analytics/components/home/entities_table/risk_score_cell', () => ({
  RiskScoreCell: ({ riskScore }: { riskScore?: number }) => (
    <span data-test-subj="riskScoreCellMock">
      {typeof riskScore === 'number' ? riskScore : '—'}
    </span>
  ),
}));

const stats = (override: Partial<RiskStats> = {}): RiskStats =>
  ({
    '@timestamp': '2024-01-01T00:00:00Z',
    id_field: 'user.name',
    id_value: 'bob',
    calculated_level: 'High',
    calculated_score: 50,
    calculated_score_norm: 80,
    category_1_score: 40,
    category_1_count: 3,
    category_2_score: 10,
    inputs: [],
    notes: [],
    rule_risks: [],
    multipliers: [],
    ...override,
  } as unknown as RiskStats);

const renderMini = (props: Partial<React.ComponentProps<typeof RiskSummaryMini>> = {}) =>
  render(
    <I18nProvider>
      <RiskSummaryMini
        entityType={EntityType.user}
        displayName="bob"
        riskScore={80}
        riskLevel="High"
        riskStats={stats()}
        privmonModifierEnabled
        watchlistEnabled
        {...props}
      />
    </I18nProvider>
  );

describe('RiskSummaryMini', () => {
  it('renders the summary with the entity risk score block and contributions table', () => {
    renderMini();
    expect(screen.getByTestId('entityAttachmentRiskSummaryMini')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentEntityRiskScoreBlock')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentRiskContributionsTable')).toBeInTheDocument();
  });

  it('returns null when there is no risk data', () => {
    const { container } = renderMini({ riskScore: undefined, riskStats: undefined });
    expect(container.firstChild).toBeNull();
  });

  it('shows a resolution score block when resolution risk data is provided', () => {
    renderMini({
      resolutionRiskScore: 65,
      resolutionRiskLevel: 'Moderate',
      resolutionRiskStats: stats({ calculated_score_norm: 65, calculated_level: 'Moderate' }),
    });
    expect(screen.getByTestId('entityAttachmentResolutionRiskScoreBlock')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentResolutionContributionsTable')).toBeInTheDocument();
  });
});
