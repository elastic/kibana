/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { useGroupTakeActionsItems } from '../../../detections/hooks/alerts_table/use_group_take_action_items';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import {
  defaultGroupingOptions,
  defaultGroupStatsAggregations,
  defaultGroupStatsRenderer,
  defaultGroupTitleRenderers,
} from '../../../detections/components/alerts_table/grouping_settings';
import { HeaderSection } from '../../../common/components/header_section';
import * as i18n from './translations';
import type { RiskInputs } from '../../../../common/entity_analytics/risk_engine';
import type {
  EntityRiskScore,
  EntityType,
  type HostRiskScore,
  type UserRiskScore,
} from '../../../../common/search_strategy';
import { DetectionEngineAlertsTable } from '../../../detections/components/alerts_table';
import { GroupedAlertsTable } from '../../../detections/components/alerts_table/alerts_grouping';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../common/store/inputs';
import { useUserData } from '../../../detections/components/user_info';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { RiskInformationButtonEmpty } from '../risk_information';
import { useDataViewSpec } from '../../../data_view_manager/hooks/use_data_view_spec';

export interface TopRiskScoreContributorsAlertsProps<T extends EntityType> {
  toggleStatus: boolean;
  toggleQuery?: (status: boolean) => void;
  riskScore: EntityRiskScore<T>;
  riskEntity: T;
  loading: boolean;
}

export const TopRiskScoreContributorsAlerts = <T extends EntityType>({
  toggleStatus,
  toggleQuery,
  riskScore,
  riskEntity,
  loading,
}: TopRiskScoreContributorsAlertsProps<T>) => {
  const { to, from } = useGlobalTime();
  const [{ loading: userInfoLoading, hasIndexWrite, hasIndexMaintenance }] = useUserData();

  const { sourcererDataView: oldSourcererDataViewSpec } = useSourcererDataView(
    SourcererScopeName.detections
  );
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const { dataViewSpec: experimentalDataViewSpec } = useDataViewSpec(SourcererScopeName.detections);
  const sourcererDataViewSpec: DataViewSpec = newDataViewPickerEnabled
    ? experimentalDataViewSpec
    : oldSourcererDataViewSpec;

  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);

  const query = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

  const inputFilters = useMemo(() => {
    // TODO Add support for services on a follow-up PR
    const riskScoreEntity =
      riskEntity === EntityType.host
        ? (riskScore as HostRiskScore).host
        : (riskScore as UserRiskScore).user;

    const riskInputs = (riskScoreEntity?.risk?.inputs ?? []) as RiskInputs;
    return [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
        },
        query: {
          terms: {
            _id: riskInputs.map((item) => item.id),
          },
        },
      },
    ];
  }, [riskScore, riskEntity]);

  const renderGroupedAlertTable = useCallback(
    (groupingFilters: Filter[]) => {
      return (
        <DetectionEngineAlertsTable
          tableType={TableId.alertsRiskInputs}
          inputFilters={[...inputFilters, ...filters, ...groupingFilters]}
        />
      );
    },
    [inputFilters, filters]
  );

  const defaultFilters = useMemo(() => [...inputFilters, ...filters], [filters, inputFilters]);

  const groupTakeActionItems = useGroupTakeActionsItems({
    showAlertStatusActions: Boolean(hasIndexWrite) && Boolean(hasIndexMaintenance),
  });

  const accordionExtraActionGroupStats = useMemo(
    () => ({
      aggregations: defaultGroupStatsAggregations,
      renderer: defaultGroupStatsRenderer,
    }),
    []
  );

  return (
    <EuiPanel hasBorder data-test-subj="topRiskScoreContributorsAlerts">
      <EuiFlexGroup gutterSize={'none'}>
        <EuiFlexItem grow={1}>
          <HeaderSection
            title={i18n.TOP_RISK_SCORE_CONTRIBUTORS}
            hideSubtitle
            toggleQuery={toggleQuery}
            toggleStatus={toggleStatus}
            headerFilters={<RiskInformationButtonEmpty riskEntity={riskEntity} />}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {toggleStatus && (
        <EuiFlexGroup
          data-test-subj="topRiskScoreContributorsAlerts-table"
          gutterSize="none"
          direction="column"
        >
          <EuiFlexItem grow={1}>
            <GroupedAlertsTable
              accordionButtonContent={defaultGroupTitleRenderers}
              accordionExtraActionGroupStats={accordionExtraActionGroupStats}
              dataViewSpec={sourcererDataViewSpec}
              defaultFilters={defaultFilters}
              defaultGroupingOptions={defaultGroupingOptions}
              from={from}
              globalFilters={filters}
              globalQuery={query}
              groupTakeActionItems={groupTakeActionItems}
              loading={userInfoLoading || loading}
              renderChildComponent={renderGroupedAlertTable}
              tableId={TableId.alertsRiskInputs}
              to={to}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
