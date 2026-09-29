/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { RESOLUTION_SECTION_TEST_ID } from '../../../entity_analytics/components/entity_resolution/test_ids';
import { useHasEntityResolutionLicense } from '../../../common/hooks/use_has_entity_resolution_license';
import { ServicePanelContent } from './content';
import { mockServiceEntityRiskScores } from '../mocks';

vi.mock('../../../entity_analytics/components/entity_resolution/resolution_section', () => {
  const mocked = {
    ResolutionSection: () => <div data-test-subj="securitySolutionFlyoutResolutionSection" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/hooks/use_has_entity_resolution_license', () => {
  const mocked = {
    useHasEntityResolutionLicense: vi.fn(() => false),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../entity_analytics/components/risk_summary_flyout/risk_summary', () => {
  const mocked = {
    FlyoutRiskSummary: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../shared/components/right/visualizations_section', () => {
  const mocked = {
    VisualizationsSection: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../entity_analytics/components/asset_criticality/asset_criticality_selector', () => {
  const mocked = {
    AssetCriticalityAccordion: () => <div data-test-subj="assetCriticalityAccordionMock" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../flyout_v2/entity/shared/components/observed_entity', () => {
  const mocked = {
    ObservedEntity: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./hooks/use_observed_service_items', () => {
  const mocked = {
    useObservedServiceItems: () => [],
  };
  return { ...mocked, default: mocked };
});

const defaultProps = {
  serviceName: 'nginx',
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

describe('ServicePanelContent — resolution license gating', () => {
  beforeEach(() => {
    (useHasEntityResolutionLicense as Mock).mockReturnValue(false);
  });

  it('does not render ResolutionSection when license is inactive', () => {
    render(<ServicePanelContent {...defaultProps} />, { wrapper: TestProviders });
    expect(screen.queryByTestId(RESOLUTION_SECTION_TEST_ID)).not.toBeInTheDocument();
  });

  it('renders ResolutionSection when license is active and entityStoreEntityId is set', () => {
    (useHasEntityResolutionLicense as Mock).mockReturnValue(true);
    render(<ServicePanelContent {...defaultProps} />, { wrapper: TestProviders });
    expect(screen.getByTestId(RESOLUTION_SECTION_TEST_ID)).toBeInTheDocument();
  });
});

describe('ServicePanelContent — legacy asset criticality accordion gating', () => {
  beforeEach(() => {
    (useHasEntityResolutionLicense as Mock).mockReturnValue(false);
  });

  it('renders the legacy accordion when entity store v2 is disabled', () => {
    render(<ServicePanelContent {...defaultProps} entityStoreV2Enabled={false} />, {
      wrapper: TestProviders,
    });
    expect(screen.getByTestId('assetCriticalityAccordionMock')).toBeInTheDocument();
  });

  it('does not render the legacy accordion when entity store v2 is enabled', () => {
    render(<ServicePanelContent {...defaultProps} entityStoreV2Enabled />, {
      wrapper: TestProviders,
    });
    expect(screen.queryByTestId('assetCriticalityAccordionMock')).not.toBeInTheDocument();
  });

  it('does not render the legacy accordion with entity store v2 enabled and no entity record', () => {
    render(
      <ServicePanelContent {...defaultProps} entityStoreV2Enabled entityRecord={undefined} />,
      { wrapper: TestProviders }
    );
    expect(screen.queryByTestId('assetCriticalityAccordionMock')).not.toBeInTheDocument();
  });
});
