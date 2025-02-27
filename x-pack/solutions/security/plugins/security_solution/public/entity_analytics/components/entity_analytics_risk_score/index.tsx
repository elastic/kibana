/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../flyout/entity_details/shared/constants';
import { EnableRiskScore } from '../enable_risk_score';
import { getRiskScoreColumns } from './columns';
import { LastUpdatedAt } from '../../../common/components/last_updated_at';
import { HeaderSection } from '../../../common/components/header_section';
import {
  type EntityType,
  EntityTypeToIdentifierField,
} from '../../../../common/entity_analytics/types';
import { generateSeverityFilter } from '../../../explore/hosts/store/helpers';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { InspectButtonContainer } from '../../../common/components/inspect';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { StyledBasicTable } from '../styled_basic_table';
import { Loader } from '../../../common/components/loader';
import { Panel } from '../../../common/components/panel';
import { useEntityInfo } from './use_entity';
import { RiskScoreHeaderContent } from './header_content';
import { ChartContent } from './chart_content';
import { useNavigateToAlertsPageWithFilters } from '../../../common/hooks/use_navigate_to_alerts_page_with_filters';
import { getRiskEntityTranslation } from './translations';
import { useKibana } from '../../../common/lib/kibana';
import { useGlobalFilterQuery } from '../../../common/hooks/use_global_filter_query';
import { useRiskScoreKpi } from '../../api/hooks/use_risk_score_kpi';
import { useRiskScore } from '../../api/hooks/use_risk_score';
import { RiskEnginePrivilegesCallOut } from '../risk_engine_privileges_callout';
import { useMissingRiskEnginePrivileges } from '../../hooks/use_missing_risk_engine_privileges';
import { EntityEventTypes } from '../../../common/lib/telemetry';
import { RiskScoresNoDataDetected } from '../risk_score_no_data_detected';
import { RiskScoreHeaderTitle } from '../risk_score_header_title';

export const ENTITY_RISK_SCORE_TABLE_ID = 'entity-risk-score-table';

const EntityAnalyticsRiskScoresComponent = <T extends EntityType>({
  riskEntity,
}: {
  riskEntity: T;
}) => {
  const { deleteQuery, setQuery, from, to } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const entity = useEntityInfo(riskEntity);
  const openAlertsPageWithFilters = useNavigateToAlertsPageWithFilters();
  const { telemetry } = useKibana().services;
  const { openRightPanel } = useExpandableFlyoutApi();
  const entityNameField = EntityTypeToIdentifierField[riskEntity];

  const openEntityOnAlertsPage = useCallback(
    (entityName: string) => {
      telemetry.reportEvent(EntityEventTypes.EntityAlertsClicked, { entity: riskEntity });
      openAlertsPageWithFilters([
        {
          title: getRiskEntityTranslation(riskEntity),
          selectedOptions: [entityName],
          fieldName: entityNameField,
        },
      ]);
    },
    [telemetry, riskEntity, openAlertsPageWithFilters, entityNameField]
  );

  const openEntityOnExpandableFlyout = useCallback(
    (entityName: string) => {
      const panelKey = EntityPanelKeyByType[riskEntity];
      const panelParam = EntityPanelParamByType[riskEntity];
      if (panelKey && panelParam) {
        openRightPanel({
          id: panelKey,
          params: {
            [panelParam]: entityName,
            contextID: ENTITY_RISK_SCORE_TABLE_ID,
            scopeId: ENTITY_RISK_SCORE_TABLE_ID,
          },
        });
      }
    },
    [openRightPanel, riskEntity]
  );

  const { toggleStatus, setToggleStatus } = useQueryToggle(entity.tableQueryId);
  const columns = useMemo(
    () => getRiskScoreColumns(riskEntity, openEntityOnAlertsPage, openEntityOnExpandableFlyout),
    [riskEntity, openEntityOnAlertsPage, openEntityOnExpandableFlyout]
  );
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);

  const onSelectSeverityFilter = useCallback((newSelection: RiskSeverity[]) => {
    setSelectedSeverity(newSelection);
  }, []);

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity, riskEntity);
    return filter ? filter : undefined;
  }, [riskEntity, selectedSeverity]);

  const { filterQuery } = useGlobalFilterQuery({
    extraFilter: severityFilter,
  });

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const {
    severityCount,
    loading: isKpiLoading,
    refetch: refetchKpi,
    inspect: inspectKpi,
  } = useRiskScoreKpi({
    filterQuery,
    skip: !toggleStatus,
    timerange,
    riskEntity,
  });

  useQueryInspector({
    queryId: entity.kpiQueryId,
    loading: isKpiLoading,
    refetch: refetchKpi,
    setQuery,
    deleteQuery,
    inspect: inspectKpi,
  });

  const {
    data,
    loading: isTableLoading,
    inspect,
    refetch,
    isAuthorized,
    hasEngineBeenInstalled,
  } = useRiskScore({
    filterQuery,
    skip: !toggleStatus,
    pagination: {
      cursorStart: 0,
      querySize: 5,
    },
    timerange,
    riskEntity,
    includeAlertsCount: true,
  });

  useQueryInspector({
    queryId: entity.tableQueryId,
    loading: isTableLoading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [isTableLoading, isKpiLoading]); // Update the time when data loads

  const privileges = useMissingRiskEnginePrivileges(['read']);

  if (!isAuthorized) {
    return null;
  }

  const isDisabled = !hasEngineBeenInstalled && !isTableLoading;

  if (!privileges.isLoading && !privileges.hasAllRequiredPrivileges) {
    return (
      <EuiPanel hasBorder>
        <RiskEnginePrivilegesCallOut privileges={privileges} />
      </EuiPanel>
    );
  }

  if (isDisabled) {
    return <EnableRiskScore isDisabled={isDisabled} entityType={riskEntity} />;
  }

  if (hasEngineBeenInstalled && selectedSeverity.length === 0 && data && data.length === 0) {
    return <RiskScoresNoDataDetected entityType={riskEntity} />;
  }

  return (
    <InspectButtonContainer>
      <Panel hasBorder data-test-subj={`entity_analytics_${riskEntity}s`}>
        <HeaderSection
          title={<RiskScoreHeaderTitle riskScoreEntity={riskEntity} />}
          titleSize="s"
          subtitle={
            <LastUpdatedAt isUpdating={isTableLoading || isKpiLoading} updatedAt={updatedAt} />
          }
          id={entity.tableQueryId}
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
        >
          <RiskScoreHeaderContent
            entityLinkProps={entity.linkProps}
            onSelectSeverityFilter={onSelectSeverityFilter}
            riskEntity={riskEntity}
            selectedSeverity={selectedSeverity}
            toggleStatus={toggleStatus}
          />
        </HeaderSection>
        {toggleStatus && (
          <EuiFlexGroup data-test-subj="entity_analytics_content">
            <EuiFlexItem grow={false}>
              <ChartContent
                dataExists={data && data.length > 0}
                kpiQueryId={entity.kpiQueryId ?? ''}
                riskEntity={riskEntity}
                severityCount={severityCount}
                timerange={timerange}
                selectedSeverity={selectedSeverity}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <StyledBasicTable
                responsiveBreakpoint={false}
                items={data ?? []}
                columns={columns}
                loading={isTableLoading}
                id={entity.tableQueryId}
                rowProps={{
                  className: 'EntityAnalyticsTableHoverActions',
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {(isTableLoading || isKpiLoading) && (
          <Loader data-test-subj="loadingPanelRiskScore" overlay size="xl" />
        )}
      </Panel>
    </InspectButtonContainer>
  );
};

export const EntityAnalyticsRiskScores = React.memo(EntityAnalyticsRiskScoresComponent);
EntityAnalyticsRiskScores.displayName = 'EntityAnalyticsRiskScores';
