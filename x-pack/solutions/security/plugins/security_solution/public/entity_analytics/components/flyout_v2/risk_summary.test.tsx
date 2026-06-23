/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutRiskSummary } from './risk_summary';
import { EntityType } from '../../../../common/search_strategy';
import type { RiskScoreState } from '../../api/hooks/use_risk_score';

jest.mock('../risk_summary_flyout/risk_summary', () => ({
  FlyoutRiskSummary: jest.fn(() => <div data-test-subj="base-risk-summary" />),
}));

import { FlyoutRiskSummary as FlyoutRiskSummaryBase } from '../risk_summary_flyout/risk_summary';

describe('FlyoutRiskSummary (flyout v2 wrapper)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 FlyoutRiskSummary with isPreviewMode enabled and forwards props', () => {
    const openDetailsPanel = jest.fn();
    const riskScoreData = {
      loading: false,
      data: [],
    } as unknown as RiskScoreState<EntityType.host>;

    const { getByTestId } = render(
      <FlyoutRiskSummary
        entityType={EntityType.host}
        riskScoreData={riskScoreData}
        recalculatingScore={false}
        queryId="query-id"
        openDetailsPanel={openDetailsPanel}
        entityId="host-entity-id"
      />
    );

    expect(getByTestId('base-risk-summary')).toBeInTheDocument();

    const props = (FlyoutRiskSummaryBase as unknown as jest.Mock).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        entityType: EntityType.host,
        riskScoreData,
        recalculatingScore: false,
        queryId: 'query-id',
        openDetailsPanel,
        entityId: 'host-entity-id',
        isPreviewMode: true,
      })
    );
  });
});
