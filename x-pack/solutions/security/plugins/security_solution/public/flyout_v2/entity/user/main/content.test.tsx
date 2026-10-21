/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { RESOLUTION_SECTION_TEST_ID } from '../../../../entity_analytics/components/entity_resolution/test_ids';
import { useHasEntityResolutionLicense } from '../../../../common/hooks/use_has_entity_resolution_license';
import { USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG } from '../../../../../common/constants';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import { Content } from './content';
import { mockUserEntityRiskScores } from '../../../../flyout/entity_details/mocks';

const mockFlyoutRiskSummary = jest.fn((_props: { isGroupView?: boolean }) => (
  <div data-test-subj="flyoutRiskSummary" />
));

jest.mock('../../../../entity_analytics/components/entity_resolution/resolution_section', () => ({
  ResolutionSection: () => <div data-test-subj="securitySolutionFlyoutResolutionSection" />,
}));
jest.mock('../../../../common/hooks/use_has_entity_resolution_license', () => ({
  useHasEntityResolutionLicense: jest.fn(() => false),
}));
jest.mock('../../../../entity_analytics/components/risk_summary_flyout/risk_summary', () => ({
  FlyoutRiskSummary: (props: { isGroupView?: boolean }) => mockFlyoutRiskSummary(props),
}));
jest.mock(
  '../../../../flyout/entity_details/shared/components/right/visualizations_section',
  () => ({
    VisualizationsSection: () => <div data-test-subj="visualizationsSection" />,
  })
);
jest.mock(
  '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector',
  () => ({
    AssetCriticalityAccordion: () => <div data-test-subj="assetCriticalityAccordionMock" />,
  })
);
const mockEntityHighlightsAccordion = jest.fn((_props: { mode?: string }) => null);
jest.mock(
  '../../../../entity_analytics/components/entity_details_flyout/components/entity_highlights',
  () => ({
    EntityHighlightsAccordion: (props: { mode?: string }) => mockEntityHighlightsAccordion(props),
  })
);
const mockEntityInsight = jest.fn((_props: { aliasRecords?: readonly unknown[] }) => null);
jest.mock('../../../../cloud_security_posture/components/entity_insight', () => ({
  EntityInsight: (props: { aliasRecords?: readonly unknown[] }) => mockEntityInsight(props),
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

const appearsBefore = (html: string, earlier: string, later: string) =>
  html.indexOf(earlier) < html.indexOf(later);

describe('Content — resolution section placement', () => {
  const resolvedScores = {
    ...mockUserEntityRiskScores,
    resolution: {
      ...mockUserEntityRiskScores.resolution,
      hasResolutionGroup: true,
      resolutionTargetEntityId: 'user:target',
      state: {
        ...mockUserEntityRiskScores.resolution.state,
        loading: false,
        data: mockUserEntityRiskScores.base.data,
      },
    },
  };

  const renderContent = (newEntityAnalyticsPage: boolean) => {
    const startServices = createStartServicesMock();
    jest
      .mocked(startServices.featureFlags.useBooleanValue)
      .mockImplementation((flag, fallback) =>
        flag === USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG ? newEntityAnalyticsPage : fallback
      );
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);

    return render(
      <TestProviders startServices={startServices}>
        <Content
          {...defaultProps}
          entityRiskScores={resolvedScores}
          riskScoreState={{ hasEngineBeenInstalled: true, data: [{}], loading: false } as never}
        />
      </TestProviders>
    );
  };

  it('keeps the resolution section below visualizations when the flag is off', () => {
    const { container } = renderContent(false);
    expect(
      appearsBefore(container.innerHTML, 'visualizationsSection', RESOLUTION_SECTION_TEST_ID)
    ).toBe(true);
  });

  it('moves the resolution section above visualizations when the flag is on', () => {
    const { container } = renderContent(true);
    const html = container.innerHTML;
    expect(appearsBefore(html, 'flyoutRiskSummary', RESOLUTION_SECTION_TEST_ID)).toBe(true);
    expect(appearsBefore(html, RESOLUTION_SECTION_TEST_ID, 'visualizationsSection')).toBe(true);
  });
});

describe('Content — group view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const riskScoreState = { hasEngineBeenInstalled: true, data: [{}], loading: false } as never;

  it('defaults the risk summary to the single-entity view', () => {
    render(<Content {...defaultProps} riskScoreState={riskScoreState} />, {
      wrapper: TestProviders,
    });
    expect(mockFlyoutRiskSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ isGroupView: false })
    );
  });

  it('forwards isGroupView to the risk summary', () => {
    render(<Content {...defaultProps} riskScoreState={riskScoreState} isGroupView />, {
      wrapper: TestProviders,
    });
    expect(mockFlyoutRiskSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ isGroupView: true })
    );
  });

  it('forwards the view mode to the entity summary so it covers the whole group', () => {
    render(<Content {...defaultProps} mode="resolved" />, { wrapper: TestProviders });
    expect(mockEntityHighlightsAccordion).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'resolved' })
    );
  });

  it('tells the entity summary to wait while the entity store record is loading', () => {
    render(<Content {...defaultProps} isEntityRecordLoading />, { wrapper: TestProviders });
    expect(mockEntityHighlightsAccordion).toHaveBeenLastCalledWith(
      expect.objectContaining({ isEntityRecordLoading: true })
    );
  });

  it('leaves the entity summary in single mode when no mode is given', () => {
    render(<Content {...defaultProps} />, { wrapper: TestProviders });
    expect(mockEntityHighlightsAccordion).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: undefined })
    );
  });

  it('forwards the alias records to the insights so alerts and findings cover the whole group', () => {
    const aliasRecords = [{ entity: { id: 'user:alias' }, user: { name: 'alias' } }] as never;
    render(<Content {...defaultProps} isGroupView aliasRecords={aliasRecords} />, {
      wrapper: TestProviders,
    });
    expect(mockEntityInsight).toHaveBeenLastCalledWith(expect.objectContaining({ aliasRecords }));
  });
});

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
