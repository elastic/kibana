/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  GENERIC_ENTITY_FLYOUT_OPENED,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { css } from '@emotion/react';
import { EuiEmptyPrompt, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { buildEntityNameFilter } from '../../../../../common/search_strategy';
import { EntityIdentifierFields, EntityType } from '../../../../../common/entity_analytics/types';
import type { Refetch } from '../../../../common/types';
import { FIRST_RECORD_PAGINATION } from '../../../../entity_analytics/common';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useRefetchQueryById } from '../../../../entity_analytics/api/hooks/use_refetch_query_by_id';
import { useCalculateEntityRiskScore } from '../../../../entity_analytics/api/hooks/use_calculate_entity_risk_score';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../../../entity_analytics/components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import {
  CspInsightLeftPanelSubTab,
  EntityDetailsLeftPanelTab,
  type EntityDetailsPath,
} from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import {
  useGetGenericEntity,
  type UseGetGenericEntityParams,
} from '../../../../flyout/entity_details/generic_right/hooks/use_get_generic_entity';
import { useGenericEntityCriticality } from '../../../../flyout/entity_details/generic_right/hooks/use_generic_entity_criticality';
import { GenericEntityFlyoutHeader } from '../../../../flyout/entity_details/generic_right/header';
import { GenericEntityFlyoutContent } from '../../../../flyout/entity_details/generic_right/content';
import { GenericEntityFlyoutFooter } from '../../../../flyout/entity_details/generic_right/footer';
import { GENERIC_FLYOUT_STORAGE_KEYS } from '../../../../flyout/entity_details/generic_right/constants';
import { useFlyoutApi } from '../../../use_flyout_api';
import { FLYOUT_ORIGIN } from '../../../../common/lib/telemetry';

export type GenericEntityProps = {
  scopeId: string;
  contextID?: string;
} & UseGetGenericEntityParams;

/**
 * Standalone generic-entity details flyout content (for use with the entity flyout API).
 *
 * Runs the same data hooks as the v1 `GenericEntityPanel`, but without the expandable-flyout
 * navigation or preview-mode handling. Detail panels (fields table, CSP insights) open as separate
 * system flyouts via `useFlyoutApi`.
 */
export const GenericEntity: FC<GenericEntityProps> = memo(function GenericEntity(params) {
  const { scopeId } = params;
  const { euiTheme } = useEuiTheme();
  const {
    openGenericEntityFlyoutAsChild,
    openEntityFieldsTable,
    openEntityMisconfigurationInsights,
    openEntityVulnerabilityInsights,
    openEntityAlertsInsights,
  } = useFlyoutApi();

  const { getGenericEntity } = useGetGenericEntity(params);
  const genericInsightsValue = getGenericEntity.data?._source?.entity.id;
  const identityFields = useMemo(
    () => ({ 'related.entity': genericInsightsValue || '' }),
    [genericInsightsValue]
  );
  const { getAssetCriticality } = useGenericEntityCriticality({
    enabled: !!genericInsightsValue,
    idField: EntityIdentifierFields.generic,
    // @ts-ignore since this query is only enabled when the entity.id exists, we can safely assume that idValue won't be undefined
    idValue: genericInsightsValue,
  });

  const genericNameFilterQuery = useMemo(
    () =>
      genericInsightsValue
        ? buildEntityNameFilter(EntityType.generic, [genericInsightsValue])
        : undefined,
    [genericInsightsValue]
  );

  const riskScoreState = useRiskScore({
    riskEntity: EntityType.generic,
    filterQuery: genericNameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
  });

  const { refetch } = riskScoreState;
  const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID);
  const refetchRiskScore = useCallback(() => {
    refetch();
    (refetchRiskInputsTab as Refetch | null)?.();
  }, [refetch, refetchRiskInputsTab]);

  const { calculateEntityRiskScore } = useCalculateEntityRiskScore({
    identifierType: EntityType.generic,
    identifier: genericInsightsValue || '',
    entityId: genericInsightsValue || undefined,
    onSuccess: refetchRiskScore,
  });

  useEffect(() => {
    if (getGenericEntity.data?._id) {
      uiMetricService.trackUiMetric(METRIC_TYPE.COUNT, GENERIC_ENTITY_FLYOUT_OPENED);
    }
  }, [getGenericEntity.data?._id]);

  const onShowGeneric = useCallback(() => {
    openGenericEntityFlyoutAsChild({ ...params, origin: FLYOUT_ORIGIN.TOOL_HEADER_TITLE });
  }, [openGenericEntityFlyoutAsChild, params]);

  const openDetailsPanel = useCallback(
    (path: EntityDetailsPath) => {
      const value = genericInsightsValue || '';

      switch (path.tab) {
        case EntityDetailsLeftPanelTab.FIELDS_TABLE:
          return openEntityFieldsTable({
            document: (getGenericEntity.data?._source ?? {}) as Record<string, unknown>,
            tableStorageKey: GENERIC_FLYOUT_STORAGE_KEYS.OVERVIEW_FIELDS_TABLE_PINS,
            entityName: value,
            onShowEntity: onShowGeneric,
            origin: FLYOUT_ORIGIN.FIELDS_SECTION,
          });
        case EntityDetailsLeftPanelTab.CSP_INSIGHTS:
          switch (path.subTab) {
            case CspInsightLeftPanelSubTab.MISCONFIGURATIONS:
              return openEntityMisconfigurationInsights({
                entityType: EntityType.generic,
                value,
                entityId: genericInsightsValue,
                onShowEntity: onShowGeneric,
                origin: FLYOUT_ORIGIN.INSIGHTS_MISCONFIGURATION,
              });
            case CspInsightLeftPanelSubTab.VULNERABILITIES:
              return openEntityVulnerabilityInsights({
                value,
                entityId: genericInsightsValue,
                entityType: EntityType.generic,
                onShowHost: onShowGeneric,
                origin: FLYOUT_ORIGIN.INSIGHTS_VULNERABILITY,
              });
            case CspInsightLeftPanelSubTab.ALERTS:
              return openEntityAlertsInsights({
                entityType: EntityType.generic,
                value,
                entityId: genericInsightsValue,
                onShowEntity: onShowGeneric,
                origin: FLYOUT_ORIGIN.INSIGHTS_ALERTS,
              });
          }
      }
    },
    [
      openEntityFieldsTable,
      openEntityMisconfigurationInsights,
      openEntityVulnerabilityInsights,
      openEntityAlertsInsights,
      genericInsightsValue,
      getGenericEntity.data?._source,
      onShowGeneric,
    ]
  );

  if (getGenericEntity.isLoading || getAssetCriticality.isLoading) {
    return (
      <EuiLoadingSpinner
        size="xxl"
        css={{ position: 'absolute', inset: '50%' }}
        data-test-subj="generic-flyout-loading"
      />
    );
  }

  if (!getGenericEntity.data?._source || getGenericEntity.isError) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="warning"
        data-test-subj="generic-right-flyout-error-prompt"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.flyoutV2.genericEntityFlyout.errorTitle"
              defaultMessage="Unable to load entity"
            />
          </h2>
        }
      />
    );
  }

  const source = getGenericEntity.data._source;
  const entity = getGenericEntity.data._source.entity;
  const fields = getGenericEntity.data.fields || {};
  const assetCriticalityLevel = getAssetCriticality.data?.criticality_level;

  return (
    <>
      <GenericEntityFlyoutHeader
        entity={entity}
        source={source}
        flyoutHeaderProps={{
          css: css`
            padding-block: ${euiTheme.size.s} !important;
          `,
          panelProps: { paddingSize: 'none' },
        }}
      />
      <GenericEntityFlyoutContent
        source={source}
        openGenericEntityDetailsPanelByPath={openDetailsPanel}
        identityFields={identityFields}
        onAssetCriticalityChange={calculateEntityRiskScore}
        flyoutBodyProps={{ panelProps: { paddingSize: 'none' } }}
      />
      <GenericEntityFlyoutFooter
        scopeId={scopeId}
        isPreviewMode={false}
        entityId={entity.id}
        entityFields={fields}
        assetCriticalityLevel={assetCriticalityLevel}
        flyoutFooterProps={{
          css: css`
            padding-block: ${euiTheme.size.s} !important;
          `,
        }}
        panelProps={{ paddingSize: 'none' }}
      />
    </>
  );
});

GenericEntity.displayName = 'GenericEntity';
