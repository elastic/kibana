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
import { mockServiceEntityRiskScores } from '../../../../flyout/entity_details/mocks';

const mockFlyoutRiskSummary = jest.fn((_props: { isGroupView?: boolean }) => (
  <div data-test-subj="flyoutRiskSummary" />
));

const mockResolutionSection = jest.fn((_props: { mode?: string }) => (
  <div data-test-subj="securitySolutionFlyoutResolutionSection" />
));
jest.mock('../../../../entity_analytics/components/entity_resolution/resolution_section', () => ({
  ResolutionSection: (props: { mode?: string }) => mockResolutionSection(props),
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
const mockObservedDataSection = jest.fn(
  (_props: { entityType?: string; identityFields?: Record<string, string> }) => null
);
jest.mock('../../shared/components/observed_data_section', () => ({
  ObservedDataSection: (props: { entityType?: string; identityFields?: Record<string, string> }) =>
    mockObservedDataSection(props),
}));
const mockEntityInsight = jest.fn(
  (_props: { entityType?: string; aliasRecords?: readonly unknown[] }) => (
    <div data-test-subj="entityInsightMock" />
  )
);
jest.mock('../../../../cloud_security_posture/components/entity_insight', () => ({
  EntityInsight: (props: { entityType?: string; aliasRecords?: readonly unknown[] }) =>
    mockEntityInsight(props),
}));

const mockEntityHighlightsAccordion = jest.fn((_props: { mode?: string }) => null);
jest.mock(
  '../../../../entity_analytics/components/entity_details_flyout/components/entity_highlights',
  () => ({
    EntityHighlightsAccordion: (props: { mode?: string }) => mockEntityHighlightsAccordion(props),
  })
);

const defaultProps = {
  identityFields: { 'service.name': 'nginx' },
  observedService: { details: {}, isLoading: false } as never,
  riskScoreState: { hasEngineBeenInstalled: false, data: [], loading: false } as never,
  entityRiskScores: mockServiceEntityRiskScores,
  recalculatingScore: false,
  contextID: 'test',
  scopeId: 'test',
  onAssetCriticalityChange: () => {},
  openDetailsPanel: () => {},
  isPreviewMode: false,
  entityStoreV2Enabled: false,
  entityStoreEntityId: 'service:nginx@okta',
  riskScoreQueryId: 'servicePanelRiskScoreQuery',
};

describe('Content — resolution license gating', () => {
  beforeEach(() => {
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(false);
  });

  it('does not render ResolutionSection when license is inactive', () => {
    render(<Content {...defaultProps} />, { wrapper: TestProviders });
    expect(screen.queryByTestId(RESOLUTION_SECTION_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders ResolutionSection when license is active and entityStoreEntityId is set', () => {
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);
    render(<Content {...defaultProps} />, { wrapper: TestProviders });
    expect(screen.getByTestId(RESOLUTION_SECTION_TEST_ID)).toBeInTheDocument();
  });
});

const appearsBefore = (html: string, earlier: string, later: string) =>
  html.indexOf(earlier) < html.indexOf(later);

describe('Content — resolution section placement', () => {
  const resolvedScores = {
    ...mockServiceEntityRiskScores,
    resolution: {
      ...mockServiceEntityRiskScores.resolution,
      hasResolutionGroup: true,
      resolutionTargetEntityId: 'service:target',
      state: {
        ...mockServiceEntityRiskScores.resolution.state,
        loading: false,
        data: mockServiceEntityRiskScores.base.data,
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

  it('leaves the entity summary in single mode when no mode is given (legacy flyout)', () => {
    render(<Content {...defaultProps} />, { wrapper: TestProviders });
    expect(mockEntityHighlightsAccordion).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: undefined })
    );
  });
});

describe('Content — legacy asset criticality accordion gating', () => {
  beforeEach(() => {
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(false);
  });

  it('renders the legacy accordion when entity store v2 is disabled', () => {
    render(<Content {...defaultProps} entityStoreV2Enabled={false} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByTestId('assetCriticalityAccordionMock')).toBeInTheDocument();
  });

  it('does not render the legacy accordion when entity store v2 is enabled', () => {
    render(<Content {...defaultProps} entityStoreV2Enabled />, {
      wrapper: TestProviders,
    });
    expect(screen.queryByTestId('assetCriticalityAccordionMock')).not.toBeInTheDocument();
  });

  it('does not render the legacy accordion with entity store v2 enabled and no entity record', () => {
    render(<Content {...defaultProps} entityStoreV2Enabled entityRecord={undefined} />, {
      wrapper: TestProviders,
    });
    expect(screen.queryByTestId('assetCriticalityAccordionMock')).not.toBeInTheDocument();
  });
});

describe('Content — entity not in store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const riskScoreState = { hasEngineBeenInstalled: true, data: [{}], loading: false } as never;

  it('renders entity highlights and the risk summary by default', () => {
    render(<Content {...defaultProps} riskScoreState={riskScoreState} />, {
      wrapper: TestProviders,
    });
    expect(mockEntityHighlightsAccordion).toHaveBeenCalled();
    expect(screen.getByTestId('flyoutRiskSummary')).toBeInTheDocument();
  });

  it('hides entity highlights and the risk summary when the service is not in the store', () => {
    render(<Content {...defaultProps} riskScoreState={riskScoreState} noEntityInStore />, {
      wrapper: TestProviders,
    });
    expect(mockEntityHighlightsAccordion).not.toHaveBeenCalled();
    expect(screen.queryByTestId('flyoutRiskSummary')).not.toBeInTheDocument();
  });
});

describe('Content — insights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders service insights covering the alias records', () => {
    const aliasRecords = [{ entity: { id: 'service:alias' } }] as never;
    render(<Content {...defaultProps} aliasRecords={aliasRecords} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByTestId('entityInsightMock')).toBeInTheDocument();
    expect(mockEntityInsight).toHaveBeenLastCalledWith(
      expect.objectContaining({ entityType: 'service', aliasRecords })
    );
  });
});

describe('Content — observed attributes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the shared observed data section scoped to the service', () => {
    render(<Content {...defaultProps} />, { wrapper: TestProviders });
    expect(mockObservedDataSection).toHaveBeenLastCalledWith(
      expect.objectContaining({
        entityType: 'service',
        identityFields: { 'service.name': 'nginx' },
      })
    );
  });

  it('prefers the identity fields passed by the caller', () => {
    const identityFields = { 'service.name': 'nginx', 'service.id': 'svc-1' };
    render(<Content {...defaultProps} identityFields={identityFields} />, {
      wrapper: TestProviders,
    });
    expect(mockObservedDataSection).toHaveBeenLastCalledWith(
      expect.objectContaining({ identityFields })
    );
  });
});

describe('Content — resolution mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHasEntityResolutionLicense as jest.Mock).mockReturnValue(true);
  });

  it('forwards the view mode to the resolution section', () => {
    render(<Content {...defaultProps} mode="resolved" />, { wrapper: TestProviders });
    expect(mockResolutionSection).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'resolved' })
    );
  });
});
