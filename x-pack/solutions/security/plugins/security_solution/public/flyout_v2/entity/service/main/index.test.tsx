/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TestProviders } from '../../../../common/mock';
import type { EntityDetailsPath } from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useFlyoutApi } from '../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../use_flyout_api.mock';
import { ENTITY_PANEL_TABLE_TAB_TEST_ID } from '../../../../flyout/entity_details/shared/components/right/test_ids';
import {
  mockServiceEntityRiskScores,
  mockServiceEntityRiskScoresWithResolution,
  mockServiceRiskScoreState,
} from '../../../../flyout/entity_details/mocks';
import { mockObservedService } from '../../../../flyout/entity_details/service_right/mocks';
import type { ServiceEntity } from '../../../../../common/api/entity_analytics';
import { RiskSeverity } from '../../../../../common/search_strategy';
import { Service } from '.';

const mockProps = {
  serviceName: 'test',
  entityId: 'test-entity-id-service-abc123',
  scopeId: 'test-scope-id',
  contextID: 'test-service-panel',
};

jest.mock('../../../../common/components/visualization_actions/visualization_embeddable');

jest.mock('../../../use_flyout_api');
const mockFlyoutApi = createFlyoutApiMock();

const mockedUseGlobalTime = jest.fn();
jest.mock('../../../../common/containers/use_global_time', () => ({
  ...jest.requireActual('../../../../common/containers/use_global_time'),
  useGlobalTime: () => mockedUseGlobalTime(),
}));

// Entity store v2 is on unless a test turns it off.
const mockEntityStoreV2Enabled = jest.fn().mockReturnValue(true);
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  const { FF_ENABLE_ENTITY_STORE_V2 } = jest.requireActual('@kbn/entity-store/public');
  return {
    ...actual,
    // The footer only renders when the asset inventory setting is on.
    useKibana: () => {
      const kibana = actual.useKibana();
      const { uiSettings } = kibana.services;
      return {
        ...kibana,
        services: {
          ...kibana.services,
          uiSettings: {
            ...uiSettings,
            get: (key: string, defaultValue?: unknown) =>
              key === 'securitySolution:enableAssetInventory'
                ? true
                : uiSettings.get(key, defaultValue),
          },
        },
      };
    },
    useUiSetting: (key: string, defaultValue?: unknown) =>
      key === FF_ENABLE_ENTITY_STORE_V2
        ? mockEntityStoreV2Enabled()
        : actual.useUiSetting(key, defaultValue),
  };
});

const mockUseEntityStoreEuidApi = jest.fn();
jest.mock('@kbn/entity-store/public', () => {
  const actual = jest.requireActual('@kbn/entity-store/public');
  return {
    ...actual,
    useEntityStoreEuidApi: () => mockUseEntityStoreEuidApi() ?? actual.useEntityStoreEuidApi(),
  };
});

// Wrap the real content with trigger buttons so `openDetailsPanel` can be exercised for the tools.
const mockContentProps = jest.fn();
jest.mock('./content', () => {
  const actual = jest.requireActual('./content');
  const { CspInsightLeftPanelSubTab, EntityDetailsLeftPanelTab } = jest.requireActual(
    '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header'
  );
  const Content = (props: { openDetailsPanel: (path: EntityDetailsPath) => void }) => {
    mockContentProps(props);
    return (
      <>
        <button
          type="button"
          data-test-subj="openResolutionGroup"
          onClick={() =>
            props.openDetailsPanel({ tab: EntityDetailsLeftPanelTab.RESOLUTION_GROUP })
          }
        />
        {Object.values(CspInsightLeftPanelSubTab).map((subTab) => (
          <button
            key={subTab as string}
            type="button"
            data-test-subj={`openCspInsights-${subTab}`}
            onClick={() =>
              props.openDetailsPanel({
                tab: EntityDetailsLeftPanelTab.CSP_INSIGHTS,
                subTab: subTab as typeof CspInsightLeftPanelSubTab,
              })
            }
          />
        ))}
        <actual.Content {...props} />
      </>
    );
  };
  return { ...actual, Content };
});

jest.mock('../../../../common/utils/timeline/use_show_timeline', () => ({
  useShowTimeline: jest.fn(() => [true]),
}));

const mockedUseRiskScore = jest.fn().mockReturnValue(mockServiceRiskScoreState);
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score', () => ({
  useRiskScore: () => mockedUseRiskScore(),
}));

const mockedEntityRiskScores = jest.fn().mockReturnValue(mockServiceEntityRiskScores);
jest.mock('../../../../entity_analytics/api/hooks/use_entity_risk_score_recalculation', () => ({
  useEntityRiskScoreRecalculation: () => ({
    entityRiskScores: mockedEntityRiskScores(),
    recalculatingScore: false,
    calculateEntityRiskScore: jest.fn(),
  }),
}));

const mockedUseObservedService = jest.fn().mockReturnValue(mockObservedService);
jest.mock('./hooks/use_observed_service', () => ({
  useObservedService: (...args: unknown[]) => mockedUseObservedService(...args),
}));

const mockedUseEntityFromStore = jest.fn();
jest.mock('../../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => {
  const actual = jest.requireActual(
    '../../../../flyout/entity_details/shared/hooks/use_entity_from_store'
  );
  return {
    ...actual,
    useEntityFromStore: (...args: unknown[]) => mockedUseEntityFromStore(...args),
  };
});

const mockedUseAssetCriticalityPrivileges = jest.fn();
jest.mock(
  '../../../../entity_analytics/components/asset_criticality/use_asset_criticality',
  () => ({
    ...jest.requireActual(
      '../../../../entity_analytics/components/asset_criticality/use_asset_criticality'
    ),
    useAssetCriticalityPrivileges: () => mockedUseAssetCriticalityPrivileges(),
  })
);

const mockedUseNewEntityAnalyticsPage = jest.fn().mockReturnValue(false);
jest.mock('../../../../entity_analytics/hooks/use_new_entity_analytics_page', () => ({
  useNewEntityAnalyticsPage: () => mockedUseNewEntityAnalyticsPage(),
}));
jest.mock('../../../../common/hooks/use_has_entity_resolution_license', () => ({
  useHasEntityResolutionLicense: () => true,
}));
jest.mock(
  '../../../../entity_analytics/components/entity_resolution/hooks/use_resolution_group',
  () => ({ useResolutionGroup: () => ({ data: undefined }) })
);
jest.mock('../../../../entity_analytics/api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: () => ({ data: [] }),
}));

const emptyEntityFromStore = {
  entity: null,
  entityRecord: null,
  aliasRecords: [],
  firstSeen: null,
  lastSeen: null,
  isLoading: false,
  isInitialLoading: false,
  error: null,
  refetch: jest.fn(),
};

const targetRecord: ServiceEntity = {
  '@timestamp': '2024-01-15T10:00:00.000Z',
  entity: { id: mockProps.entityId, name: 'test', type: 'service' },
  service: { name: 'test' },
  asset: { criticality: 'low_impact' },
};
const aliasRecord: ServiceEntity = {
  ...targetRecord,
  entity: { ...targetRecord.entity, id: 'alias-entity-id' },
  asset: { criticality: 'extreme_impact' },
};

describe('<Service />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFlyoutApi as jest.Mock).mockReturnValue(mockFlyoutApi);
    mockedUseRiskScore.mockReturnValue(mockServiceRiskScoreState);
    mockedEntityRiskScores.mockReturnValue(mockServiceEntityRiskScores);
    mockedUseObservedService.mockReturnValue(mockObservedService);
    mockedUseEntityFromStore.mockReturnValue(emptyEntityFromStore);
    mockedUseAssetCriticalityPrivileges.mockReturnValue({
      data: { has_write_permissions: true },
    });
    mockedUseNewEntityAnalyticsPage.mockReturnValue(false);
    mockedUseGlobalTime.mockReturnValue({
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-02T00:00:00.000Z',
      isInitializing: false,
      setQuery: jest.fn(),
      deleteQuery: jest.fn(),
    });
    mockUseEntityStoreEuidApi.mockReturnValue(undefined);
    mockEntityStoreV2Enabled.mockReturnValue(true);
  });

  it('renders the header', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Service {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('service-panel-header')).toBeInTheDocument();
  });

  it('skips the entity store lookup while the global time is initializing', () => {
    mockedUseGlobalTime.mockReturnValue({
      isInitializing: true,
      setQuery: jest.fn(),
      deleteQuery: jest.fn(),
    });

    render(
      <TestProviders>
        <Service {...mockProps} />
      </TestProviders>
    );

    expect(mockedUseEntityFromStore).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
  });

  it('skips the entity store lookup when entity store v2 is disabled', () => {
    mockEntityStoreV2Enabled.mockReturnValue(false);

    render(
      <TestProviders>
        <Service {...mockProps} />
      </TestProviders>
    );

    expect(mockedUseEntityFromStore).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
    expect(mockContentProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ noEntityInStore: false, entityStoreV2Enabled: false })
    );
  });

  it('renders the footer', () => {
    const { getByTestId } = render(
      <TestProviders>
        <Service {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('take-action-button')).toBeInTheDocument();
  });

  it('resolves the entity id from the source document when a hit is provided', () => {
    const getEuidFromObject = jest.fn().mockReturnValue('service:from-hit');
    // Only the EUID lookup is exercised; observed data and content are driven by mocks.
    mockUseEntityStoreEuidApi.mockReturnValue({
      euid: { getEuidFromObject, getEntityIdentifiersFromDocument: () => ({}) },
      getBuiltInEntityDefinition: () => ({}),
    });
    mockedUseEntityFromStore.mockReturnValue({ ...emptyEntityFromStore, isLoading: true });
    const hit = { flattened: { 'service.name': 'test' } } as unknown as DataTableRecord;

    render(
      <TestProviders>
        <Service {...mockProps} hit={hit} />
      </TestProviders>
    );

    expect(getEuidFromObject).toHaveBeenCalledWith(expect.anything(), hit.flattened);
    expect(mockedUseEntityFromStore).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'service:from-hit' })
    );
  });

  it('falls back to the entityId prop when the hit yields no EUID', () => {
    const hit = { flattened: {} } as unknown as DataTableRecord;

    render(
      <TestProviders>
        <Service {...mockProps} hit={hit} />
      </TestProviders>
    );

    expect(mockedUseEntityFromStore).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: mockProps.entityId })
    );
  });

  describe('entity not in the store', () => {
    it('tells the content the service is not in the store and enables insights', () => {
      render(
        <TestProviders>
          <Service {...mockProps} />
        </TestProviders>
      );

      expect(mockContentProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ noEntityInStore: true, showInsights: true })
      );
    });

    it('does not flag the service as missing while the store lookup is loading', () => {
      mockedUseEntityFromStore.mockReturnValue({ ...emptyEntityFromStore, isLoading: true });

      render(
        <TestProviders>
          <Service {...mockProps} />
        </TestProviders>
      );

      expect(mockContentProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ noEntityInStore: false })
      );
    });

    it('falls back to the service name for identity fields', () => {
      render(
        <TestProviders>
          <Service {...mockProps} />
        </TestProviders>
      );

      expect(mockContentProps).toHaveBeenLastCalledWith(
        expect.objectContaining({ identityFields: { 'service.name': 'test' } })
      );
    });

    it('does not render the risk summary', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <Service {...mockProps} />
        </TestProviders>
      );

      expect(queryByTestId('risk-summary-table')).not.toBeInTheDocument();
    });
  });

  describe('entity store record present', () => {
    const withStoreRecords = (target: ServiceEntity, aliasRecords: ServiceEntity[] = []) => {
      const entityFromStore = { ...emptyEntityFromStore, entityRecord: target, aliasRecords };
      mockedUseEntityFromStore.mockReturnValue(entityFromStore);
      // The observed hook surfaces the store record, as the real hook does.
      mockedUseObservedService.mockReturnValue({
        ...mockObservedService,
        entityRecord: target,
        refetchEntityStore: entityFromStore.refetch,
      });
    };

    it('defaults to single mode in the entity store lookup', () => {
      withStoreRecords(targetRecord);

      render(
        <TestProviders>
          <Service {...mockProps} />
        </TestProviders>
      );

      expect(mockedUseEntityFromStore).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: mockProps.entityId,
          mode: 'single',
          identityFields: undefined,
        })
      );
    });

    it('forwards resolved mode to the entity store lookup', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
      withStoreRecords(targetRecord, [aliasRecord]);

      render(
        <TestProviders>
          <Service {...mockProps} mode="resolved" />
        </TestProviders>
      );

      expect(mockedUseEntityFromStore).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: mockProps.entityId,
          mode: 'resolved',
          identityFields: undefined,
        })
      );
    });

    it('falls back to single mode when the new entity analytics page is off', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(false);
      withStoreRecords(targetRecord);

      render(
        <TestProviders>
          <Service {...mockProps} mode="resolved" />
        </TestProviders>
      );

      expect(mockedUseEntityFromStore).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: mockProps.entityId, mode: 'single' })
      );
      expect(mockedUseEntityFromStore).not.toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'resolved' })
      );
    });

    it('allows editing asset criticality when there are no aliases', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
      withStoreRecords(targetRecord);

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <Service {...mockProps} mode="resolved" />
        </TestProviders>
      );

      expect(getByTestId('asset-criticality-badge')).toHaveTextContent('Low Impact');
      expect(queryByTestId('asset-criticality-edit-chevron')).toBeInTheDocument();
    });

    it('renders the read-only group view with the max criticality across the group', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
      withStoreRecords(targetRecord, [aliasRecord]);

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <Service {...mockProps} mode="resolved" />
        </TestProviders>
      );

      expect(getByTestId('asset-criticality-badge')).toHaveTextContent('Extreme Impact');
      expect(queryByTestId('asset-criticality-edit-chevron')).not.toBeInTheDocument();
    });

    it('shows the Table tab when there are no aliases', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
      withStoreRecords(targetRecord);

      const { getByTestId } = render(
        <TestProviders>
          <Service {...mockProps} mode="resolved" />
        </TestProviders>
      );

      expect(getByTestId(ENTITY_PANEL_TABLE_TAB_TEST_ID)).toBeInTheDocument();
    });

    it('hides the Table tab in the group view', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
      withStoreRecords(targetRecord, [aliasRecord]);

      const { queryByTestId } = render(
        <TestProviders>
          <Service {...mockProps} mode="resolved" />
        </TestProviders>
      );

      expect(queryByTestId(ENTITY_PANEL_TABLE_TAB_TEST_ID)).not.toBeInTheDocument();
    });

    it('shows the "Resolved from N records" badge counting the target and its aliases', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
      withStoreRecords(targetRecord, [aliasRecord]);

      const { getByTestId } = render(
        <TestProviders>
          <Service {...mockProps} mode="resolved" />
        </TestProviders>
      );

      expect(getByTestId('service-panel-header-observed-badge')).toHaveTextContent(
        'Resolved from 2 records'
      );
    });

    describe('header risk level', () => {
      const recordWithResolutionRisk: ServiceEntity = {
        ...targetRecord,
        entity: {
          ...targetRecord.entity,
          risk: { calculated_level: RiskSeverity.Low, calculated_score_norm: 12 },
          relationships: {
            resolution: {
              risk: { calculated_level: RiskSeverity.Critical, calculated_score_norm: 91 },
            },
          },
        },
      };

      it('shows the resolution risk level when the feature flag is on, mode is resolved and aliases are returned', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        withStoreRecords(recordWithResolutionRisk, [aliasRecord]);

        const { getByTestId } = render(
          <TestProviders>
            <Service {...mockProps} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('service-panel-header')).toHaveTextContent('Risk: Critical');
      });

      it('shows the individual risk level when the feature flag is on but mode is single', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        withStoreRecords(recordWithResolutionRisk);

        const { getByTestId } = render(
          <TestProviders>
            <Service {...mockProps} />
          </TestProviders>
        );

        expect(getByTestId('service-panel-header')).toHaveTextContent('Risk: Low');
      });

      it('shows the individual risk level in resolved mode when no aliases are returned', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        withStoreRecords(recordWithResolutionRisk);

        const { getByTestId } = render(
          <TestProviders>
            <Service {...mockProps} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('service-panel-header')).toHaveTextContent('Risk: Low');
      });

      it('shows the individual risk level when the feature flag is off even in resolved mode', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(false);
        // Aliases only come back for a resolved-mode lookup, which the panel downgrades to single
        // when the flag is off.
        withStoreRecords(recordWithResolutionRisk);
        mockedUseEntityFromStore.mockImplementation(({ mode }: { mode?: string }) => ({
          ...emptyEntityFromStore,
          entityRecord: recordWithResolutionRisk,
          aliasRecords: mode === 'resolved' ? [aliasRecord] : [],
        }));

        const { getByTestId } = render(
          <TestProviders>
            <Service {...mockProps} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('service-panel-header')).toHaveTextContent('Risk: Low');
      });
    });

    describe('risk summary', () => {
      it('shows only the resolution-group risk score in the group view', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        mockedEntityRiskScores.mockReturnValue(mockServiceEntityRiskScoresWithResolution);
        withStoreRecords(targetRecord, [aliasRecord]);

        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <Service {...mockProps} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('resolution-risk-summary-table')).toBeInTheDocument();
        expect(queryByTestId('risk-summary-table')).not.toBeInTheDocument();
      });

      it('shows the individual risk score when no aliases are returned even if a resolution score exists', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        mockedEntityRiskScores.mockReturnValue(mockServiceEntityRiskScoresWithResolution);
        withStoreRecords(targetRecord);

        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <Service {...mockProps} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('risk-summary-table')).toBeInTheDocument();
        expect(queryByTestId('resolution-risk-summary-table')).not.toBeInTheDocument();
        expect(getByTestId('entityRiskInputsTitleLink')).toHaveTextContent('Risk contributions');
      });

      it('keeps showing the resolution group score next to the individual score when the feature flag is off', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(false);
        mockedEntityRiskScores.mockReturnValue(mockServiceEntityRiskScoresWithResolution);
        withStoreRecords(targetRecord);

        const { getByTestId } = render(
          <TestProviders>
            <Service {...mockProps} />
          </TestProviders>
        );

        expect(getByTestId('risk-summary-table')).toBeInTheDocument();
        expect(getByTestId('resolution-risk-summary-table')).toBeInTheDocument();
        expect(getByTestId('resolutionRiskInputsTitleLink')).toHaveTextContent(
          'Resolution group risk contributions'
        );
      });

      it('shows only the individual risk score when no aliases are returned', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        withStoreRecords(targetRecord);

        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <Service {...mockProps} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('risk-summary-table')).toBeInTheDocument();
        expect(queryByTestId('resolution-risk-summary-table')).not.toBeInTheDocument();
      });
    });

    it('passes the entity store result to the observed service hook', () => {
      withStoreRecords(targetRecord);

      render(
        <TestProviders>
          <Service {...mockProps} />
        </TestProviders>
      );

      expect(mockedUseObservedService).toHaveBeenLastCalledWith(
        mockProps.serviceName,
        mockProps.scopeId,
        expect.objectContaining({ entityRecord: targetRecord })
      );
    });

    it('builds the risk score state from the entity store record', () => {
      withStoreRecords(targetRecord);

      render(
        <TestProviders>
          <Service {...mockProps} />
        </TestProviders>
      );

      expect(mockContentProps).toHaveBeenLastCalledWith(
        expect.objectContaining({
          noEntityInStore: false,
          riskScoreState: expect.objectContaining({
            data: [expect.objectContaining({ service: expect.any(Object) })],
          }),
        })
      );
    });

    it('makes asset criticality read-only without write privileges', () => {
      mockedUseAssetCriticalityPrivileges.mockReturnValue({
        data: { has_write_permissions: false },
      });
      withStoreRecords(targetRecord);

      const { getByTestId, queryByTestId } = render(
        <TestProviders>
          <Service {...mockProps} />
        </TestProviders>
      );

      expect(getByTestId('asset-criticality-badge')).toHaveTextContent('Low Impact');
      expect(queryByTestId('asset-criticality-edit-chevron')).not.toBeInTheDocument();
    });

    describe('detail tools', () => {
      const renderResolved = () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        withStoreRecords(targetRecord, [aliasRecord]);
        return render(
          <TestProviders>
            <Service {...mockProps} mode="resolved" />
          </TestProviders>
        );
      };

      it('opens the alerts insights tool for the service', () => {
        fireEvent.click(renderResolved().getByTestId('openCspInsights-alertsTabId'));
        expect(mockFlyoutApi.openEntityAlertsInsights).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: 'service',
            value: 'test',
            entityId: mockProps.entityId,
            mode: 'resolved',
            scopeId: mockProps.scopeId,
          })
        );
      });

      it('does not open misconfiguration or vulnerability insights for a service', () => {
        const { getByTestId } = renderResolved();
        fireEvent.click(getByTestId('openCspInsights-misconfigurationTabId'));
        fireEvent.click(getByTestId('openCspInsights-vulnerabilitiesTabId'));
        expect(mockFlyoutApi.openEntityMisconfigurationInsights).not.toHaveBeenCalled();
        expect(mockFlyoutApi.openEntityVulnerabilityInsights).not.toHaveBeenCalled();
      });

      it('passes the panel mode to the resolution tool', () => {
        fireEvent.click(renderResolved().getByTestId('openResolutionGroup'));
        expect(mockFlyoutApi.openEntityResolution).toHaveBeenCalledWith(
          expect.objectContaining({ entityType: 'service', mode: 'resolved' })
        );
      });
    });
  });
});
