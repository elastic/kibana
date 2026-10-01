/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { Content } from './content';
import { mockUserEntityRiskScores } from '../../../../flyout/entity_details/mocks';

jest.mock('../../../../entity_analytics/components/entity_resolution/resolution_section', () => ({
  ResolutionSection: () => null,
}));
jest.mock('../../../../common/hooks/use_has_entity_resolution_license', () => ({
  useHasEntityResolutionLicense: jest.fn(() => false),
}));
jest.mock('../../../../entity_analytics/components/risk_summary_flyout/risk_summary', () => ({
  FlyoutRiskSummary: () => null,
}));
jest.mock(
  '../../../../flyout/entity_details/shared/components/right/visualizations_section',
  () => ({
    VisualizationsSection: () => null,
  })
);
jest.mock(
  '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector',
  () => ({
    AssetCriticalityAccordion: () => <div data-test-subj="assetCriticalityAccordionMock" />,
  })
);
jest.mock(
  '../../../../entity_analytics/components/entity_details_flyout/components/entity_highlights',
  () => ({
    EntityHighlightsAccordion: () => null,
  })
);
jest.mock('../../../../cloud_security_posture/components/entity_insight', () => ({
  EntityInsight: () => null,
}));
jest.mock('../../shared/components/observed_data_section', () => ({
  ObservedDataSection: () => null,
}));

const defaultProps = {
  identityFields: { 'user.name': 'user-1' },
  observedUser: { details: {}, isLoading: false } as never,
  riskScoreState: { hasEngineBeenInstalled: false, data: [], loading: false } as never,
  entityRiskScores: mockUserEntityRiskScores,
  recalculatingScore: false,
  contextID: 'test',
  scopeId: 'test',
  onAssetCriticalityChange: () => {},
  openDetailsPanel: () => {},
  isPreviewMode: false,
  entityStoreV2Enabled: false,
  entityStoreEntityId: 'user:user-1@okta',
  riskScoreQueryId: 'UserPanelRiskScoreQuery',
};

describe('Content — legacy asset criticality accordion gating', () => {
  it('renders the legacy accordion when entity store v2 is disabled', () => {
    render(<Content {...defaultProps} entityStoreV2Enabled={false} />, { wrapper: TestProviders });
    expect(screen.getByTestId('assetCriticalityAccordionMock')).toBeInTheDocument();
  });

  it('does not render the legacy accordion when entity store v2 is enabled', () => {
    render(<Content {...defaultProps} entityStoreV2Enabled />, { wrapper: TestProviders });
    expect(screen.queryByTestId('assetCriticalityAccordionMock')).not.toBeInTheDocument();
  });

  it('does not render the legacy accordion with entity store v2 enabled and no entity in the store', () => {
    render(
      <Content
        {...defaultProps}
        entityStoreV2Enabled
        noEntityInStore
        entityRecord={undefined}
        refetchEntityRecord={undefined}
      />,
      { wrapper: TestProviders }
    );
    expect(screen.queryByTestId('assetCriticalityAccordionMock')).not.toBeInTheDocument();
  });
});
