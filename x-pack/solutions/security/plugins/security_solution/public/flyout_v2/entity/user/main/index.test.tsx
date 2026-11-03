/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../common/mock';
import {
  mockUserEntityRiskScores,
  mockUserEntityRiskScoresWithResolution,
  mockUserRiskScoreState,
} from '../../../../flyout/entity_details/mocks';
import {
  mockObservedUser,
  mockManagedUserData,
} from '../../../../flyout/entity_details/user_right/mocks';
import type { UserEntity } from '../../../../../common/api/entity_analytics';
import { RiskSeverity } from '../../../../../common/search_strategy';
import { User } from '.';
import { useFlyoutApi } from '../../../use_flyout_api';
import { createFlyoutApiMock } from '../../../use_flyout_api.mock';
import type { EntityDetailsPath } from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';

const mockProps = {
  userName: 'test',
  scopeId: 'test-scope-id',
  contextID: 'test-user-panel',
};

jest.mock('../../../../common/components/visualization_actions/visualization_embeddable');

jest.mock('../../../use_flyout_api');
const mockFlyoutApi = createFlyoutApiMock();

// Wrap the real content with trigger buttons so `openDetailsPanel` can be exercised for the tools.
jest.mock('./content', () => {
  const actual = jest.requireActual('./content');
  const { CspInsightLeftPanelSubTab, EntityDetailsLeftPanelTab } = jest.requireActual(
    '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header'
  );
  const Content = (props: { openDetailsPanel: (path: EntityDetailsPath) => void }) => (
    <>
      <button
        type="button"
        data-test-subj="openAnomalyInsights"
        onClick={() => props.openDetailsPanel({ tab: EntityDetailsLeftPanelTab.ANOMALIES })}
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
  return { ...actual, Content };
});

const mockedUserRiskScore = jest.fn().mockReturnValue(mockUserRiskScoreState);
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score', () => ({
  useRiskScore: () => mockedUserRiskScore(),
}));

const mockedEntityRiskScores = jest.fn().mockReturnValue(mockUserEntityRiskScores);
jest.mock('../../../../entity_analytics/api/hooks/use_entity_risk_score_recalculation', () => ({
  useEntityRiskScoreRecalculation: () => ({
    entityRiskScores: mockedEntityRiskScores(),
    recalculatingScore: false,
    calculateEntityRiskScore: jest.fn(),
  }),
}));

const mockedUseObservedUser = jest.fn().mockReturnValue(mockObservedUser);
jest.mock('./hooks/use_observed_user', () => ({
  useObservedUser: () => mockedUseObservedUser(),
}));

const mockedUseManagedUser = jest.fn().mockReturnValue(mockManagedUserData);
jest.mock('../../../../flyout/entity_details/shared/hooks/use_managed_user', () => ({
  useManagedUser: () => mockedUseManagedUser(),
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

const targetRecord: UserEntity = {
  '@timestamp': '2024-01-15T10:00:00.000Z',
  entity: { id: 'test-entity-id-user-abc123', name: 'test', type: 'user' },
  user: { name: 'test' },
  asset: { criticality: 'low_impact' },
};
const targetEntityId = targetRecord.entity?.id;
const aliasRecord: UserEntity = {
  ...targetRecord,
  entity: { ...targetRecord.entity, id: 'alias-entity-id' },
  asset: { criticality: 'extreme_impact' },
};

describe('<User />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFlyoutApi as jest.Mock).mockReturnValue(mockFlyoutApi);
    mockedUserRiskScore.mockReturnValue(mockUserRiskScoreState);
    mockedEntityRiskScores.mockReturnValue(mockUserEntityRiskScores);
    mockedUseObservedUser.mockReturnValue(mockObservedUser);
    mockedUseManagedUser.mockReturnValue(mockManagedUserData);
    mockedUseEntityFromStore.mockReturnValue(emptyEntityFromStore);
    mockedUseAssetCriticalityPrivileges.mockReturnValue({
      data: { has_write_permissions: true },
    });
    mockedUseNewEntityAnalyticsPage.mockReturnValue(false);
  });

  it('renders header, content, and footer', () => {
    const { getByTestId } = render(
      <TestProviders>
        <User {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header')).toBeInTheDocument();
    expect(getByTestId('observedEntity-accordion')).toBeInTheDocument();
  });

  it('does not render an expand-details navigation button (no v2 left panel yet)', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <User {...mockProps} />
      </TestProviders>
    );

    expect(
      queryByTestId('securitySolutionFlyoutNavigationExpandDetailButton')
    ).not.toBeInTheDocument();
  });

  it('does not render a preview footer', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <User {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('user-preview-footer')).not.toBeInTheDocument();
  });

  describe('entity store record present', () => {
    const withStoreRecords = (target: UserEntity, aliasRecords: UserEntity[] = []) => {
      mockedUseEntityFromStore.mockReturnValue({
        ...emptyEntityFromStore,
        entityRecord: target,
        aliasRecords,
      });
      mockedUseObservedUser.mockReturnValue({
        ...mockObservedUser,
        entityRecord: target,
      });
    };

    it('defaults to single mode in the entity store lookup', () => {
      withStoreRecords(targetRecord);

      render(
        <TestProviders>
          <User {...mockProps} entityId={targetEntityId} />
        </TestProviders>
      );

      expect(mockedUseEntityFromStore).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: targetEntityId,
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
          <User {...mockProps} entityId={targetEntityId} mode="resolved" />
        </TestProviders>
      );

      expect(mockedUseEntityFromStore).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: targetEntityId,
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
          <User {...mockProps} entityId={targetEntityId} mode="resolved" />
        </TestProviders>
      );

      expect(mockedUseEntityFromStore).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: targetEntityId, mode: 'single' })
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
          <User {...mockProps} entityId={targetEntityId} mode="resolved" />
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
          <User {...mockProps} entityId={targetEntityId} mode="resolved" />
        </TestProviders>
      );

      expect(getByTestId('asset-criticality-badge')).toHaveTextContent('Extreme Impact');
      expect(queryByTestId('asset-criticality-edit-chevron')).not.toBeInTheDocument();
    });

    it('shows the "Resolved from N records" badge counting the target and its aliases', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
      withStoreRecords(targetRecord, [aliasRecord]);

      const { getByTestId } = render(
        <TestProviders>
          <User {...mockProps} entityId={targetEntityId} mode="resolved" />
        </TestProviders>
      );

      expect(getByTestId('user-panel-header-observed-badge')).toHaveTextContent(
        'Resolved from 2 records'
      );
    });

    it('counts every group member in the badge even when the loaded aliases are capped', () => {
      mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
      withStoreRecords(targetRecord, [aliasRecord]);
      mockedUseEntityFromStore.mockReturnValue({
        ...mockedUseEntityFromStore(),
        aliasCount: 250,
      });

      const { getByTestId } = render(
        <TestProviders>
          <User {...mockProps} entityId={targetEntityId} mode="resolved" />
        </TestProviders>
      );

      expect(getByTestId('user-panel-header-observed-badge')).toHaveTextContent(
        'Resolved from 251 records'
      );
    });

    describe('header risk level', () => {
      const recordWithResolutionRisk: UserEntity = {
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
            <User {...mockProps} entityId={targetEntityId} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('user-panel-header')).toHaveTextContent('Risk: Critical');
      });

      it('shows the individual risk level when the feature flag is on but mode is single', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        withStoreRecords(recordWithResolutionRisk);

        const { getByTestId } = render(
          <TestProviders>
            <User {...mockProps} entityId={targetEntityId} />
          </TestProviders>
        );

        expect(getByTestId('user-panel-header')).toHaveTextContent('Risk: Low');
      });

      it('shows the individual risk level in resolved mode when no aliases are returned', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        withStoreRecords(recordWithResolutionRisk);

        const { getByTestId } = render(
          <TestProviders>
            <User {...mockProps} entityId={targetEntityId} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('user-panel-header')).toHaveTextContent('Risk: Low');
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
            <User {...mockProps} entityId={targetEntityId} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('user-panel-header')).toHaveTextContent('Risk: Low');
      });
    });

    describe('risk summary', () => {
      it('shows only the resolution-group risk score in the group view', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        mockedEntityRiskScores.mockReturnValue(mockUserEntityRiskScoresWithResolution);
        withStoreRecords(targetRecord, [aliasRecord]);

        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <User {...mockProps} entityId={targetEntityId} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('resolution-risk-summary-table')).toBeInTheDocument();
        expect(queryByTestId('risk-summary-table')).not.toBeInTheDocument();
      });

      it('shows the individual risk score when no aliases are returned even if a resolution score exists', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        mockedEntityRiskScores.mockReturnValue(mockUserEntityRiskScoresWithResolution);
        withStoreRecords(targetRecord);

        const { getByTestId, queryByTestId } = render(
          <TestProviders>
            <User {...mockProps} entityId={targetEntityId} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('risk-summary-table')).toBeInTheDocument();
        expect(queryByTestId('resolution-risk-summary-table')).not.toBeInTheDocument();
        expect(getByTestId('entityRiskInputsTitleLink')).toHaveTextContent('Risk contributions');
      });

      it('keeps showing the resolution group score next to the individual score when the feature flag is off', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(false);
        mockedEntityRiskScores.mockReturnValue(mockUserEntityRiskScoresWithResolution);
        withStoreRecords(targetRecord);

        const { getByTestId } = render(
          <TestProviders>
            <User {...mockProps} entityId={targetEntityId} />
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
            <User {...mockProps} entityId={targetEntityId} mode="resolved" />
          </TestProviders>
        );

        expect(getByTestId('risk-summary-table')).toBeInTheDocument();
        expect(queryByTestId('resolution-risk-summary-table')).not.toBeInTheDocument();
      });
    });
    describe('detail tools', () => {
      const renderResolved = () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(true);
        withStoreRecords(targetRecord, [aliasRecord]);
        return render(
          <TestProviders>
            <User {...mockProps} entityId={targetEntityId} mode="resolved" />
          </TestProviders>
        );
      };

      it('passes the panel mode and scope to the anomaly insights tool', () => {
        fireEvent.click(renderResolved().getByTestId('openAnomalyInsights'));
        expect(mockFlyoutApi.openEntityAnomalyInsights).toHaveBeenCalledWith(
          expect.objectContaining({ value: 'test', mode: 'resolved', scopeId: 'test-scope-id' })
        );
      });

      it('passes the panel mode and scope to the alerts insights tool', () => {
        fireEvent.click(renderResolved().getByTestId('openCspInsights-alertsTabId'));
        expect(mockFlyoutApi.openEntityAlertsInsights).toHaveBeenCalledWith(
          expect.objectContaining({
            value: 'test',
            entityId: targetEntityId,
            mode: 'resolved',
            scopeId: 'test-scope-id',
          })
        );
      });

      it('passes the panel mode to the misconfiguration insights tool', () => {
        fireEvent.click(renderResolved().getByTestId('openCspInsights-misconfigurationTabId'));
        expect(mockFlyoutApi.openEntityMisconfigurationInsights).toHaveBeenCalledWith(
          expect.objectContaining({ value: 'test', entityId: targetEntityId, mode: 'resolved' })
        );
      });

      it('downgrades the tool mode to single when the new entity analytics page is off', () => {
        mockedUseNewEntityAnalyticsPage.mockReturnValue(false);
        withStoreRecords(targetRecord);
        const { getByTestId } = render(
          <TestProviders>
            <User {...mockProps} entityId={targetEntityId} mode="resolved" />
          </TestProviders>
        );

        fireEvent.click(getByTestId('openCspInsights-alertsTabId'));
        expect(mockFlyoutApi.openEntityAlertsInsights).toHaveBeenCalledWith(
          expect.objectContaining({ entityId: targetEntityId, mode: 'single' })
        );
      });
    });
  });
});
