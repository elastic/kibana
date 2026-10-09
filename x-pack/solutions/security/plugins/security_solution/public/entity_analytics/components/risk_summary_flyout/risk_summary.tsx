/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiAccordion, EuiSpacer, EuiTitle, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash/fp';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useNewEntityAnalyticsPage } from '../../hooks/use_new_entity_analytics_page';
import { shouldShowOnlyResolutionRisk } from './show_only_resolution_risk';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import {
  EntityDetailsLeftPanelTab,
  RiskScoreLeftPanelSubTab,
} from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { ONE_WEEK_IN_HOURS } from '../../../flyout/entity_details/shared/constants';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import type { RiskScoreState } from '../../api/hooks/use_risk_score';
import type { EntityRiskScoresState } from '../../api/hooks/use_entity_risk_scores';
import type { EntityRiskScore } from '../../../../common/search_strategy';
import { getRiskScoreSummaryAttributes } from '../../lens_attributes/risk_score_summary';
import { useSpaceId } from '../../../common/hooks/use_space_id';

import { getEntityData, getItems, LAST_30_DAYS } from './common';
import { RiskContributionsPanel } from './risk_contributions_panel';
import { EntityEventTypes } from '../../../common/lib/telemetry';

const entityRiskScoreMetricLabel = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.riskSummary.entityRiskScoreLabel',
  {
    defaultMessage: 'Entity risk score',
  }
);

const resolutionRiskScoreMetricLabel = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.riskSummary.resolutionGroupRiskScoreLabel',
  {
    defaultMessage: 'Resolution group risk score',
  }
);

const entityCaseAttachmentLabel = (entityType: EntityType, entityName?: string) =>
  i18n.translate('xpack.securitySolution.flyout.entityDetails.riskSummary.casesAttachmentLabel', {
    defaultMessage: 'Risk score for {entityType, select, user {user} other {host}} {entityName}',
    values: {
      entityName,
      entityType,
    },
  });

const resolutionCaseAttachmentLabel = (entityType: EntityType, entityName?: string) =>
  i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.resolutionRiskSummary.casesAttachmentLabel',
    {
      defaultMessage:
        'Resolution group risk score for {entityType, select, user {user} other {host}} {entityName}',
      values: {
        entityName,
        entityType,
      },
    }
  );
export interface RiskSummaryProps<T extends EntityType> {
  /**
   * General risk score source. In V1 this is name-filtered records from the
   * risk-score index. In V2 it is a minimal state built from the entity store
   * record's `entity.risk.*` summary (category counts zeroed) via
   * `buildRiskScoreStateFromEntityRecord` in the parent panel. Used as a
   * fallback when {@link entityRiskScores}.base has no data.
   */
  riskScoreData: RiskScoreState<T>;
  /**
   * V2: the entity's base + resolution-group risk scores from the
   * risk-score index, keyed by EUID.
   */
  entityRiskScores: EntityRiskScoresState<T>;
  entityType: T;
  recalculatingScore: boolean;
  queryId: string;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  isPreviewMode: boolean;
  entityId?: string;
  /** Optional prefetched resolution-group risk; used when the internal risk-index lookup returns no doc. */
  prefetchedResolutionRisk?: EntityRiskScore<T>;
  /** When true, hides the chevron icon in the section headers. Used by the v2 flyout. */
  hideHeaderIcon?: boolean;
}

const FlyoutRiskSummaryComponent = <T extends EntityType>({
  riskScoreData,
  entityRiskScores,
  entityType,
  entityId,
  recalculatingScore,
  queryId,
  openDetailsPanel,
  isPreviewMode,
  prefetchedResolutionRisk,
  hideHeaderIcon,
}: RiskSummaryProps<T>) => {
  const { telemetry } = useKibana().services;
  const { data } = riskScoreData;
  const fallbackRiskData = data && data.length > 0 ? data[0] : undefined;
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();

  const entityBaseRiskScore = entityRiskScores?.base;
  const entityResolutionRiskScore = entityRiskScores?.resolution.state;

  const baseRiskData =
    entityBaseRiskScore?.data && entityBaseRiskScore.data.length > 0
      ? entityBaseRiskScore.data[0]
      : undefined;
  const riskData = baseRiskData ?? fallbackRiskData;
  const entityData = getEntityData<T>(entityType, riskData);
  const lensAttributes = useMemo(() => {
    const entityName = entityData?.name ?? '';
    const query = entityId
      ? `${entityType}.risk.id_value: "${entityId}" AND NOT ${entityType}.risk.score_type: "resolution"`
      : `${EntityTypeToIdentifierField[entityType]}: "${entityName}" AND NOT ${entityType}.risk.score_type: "resolution"`;

    return getRiskScoreSummaryAttributes({
      severity: entityData?.risk?.calculated_level,
      query,
      spaceId,
      riskEntity: entityType,
      dataSource: 'risk_index',
      metricLabel: entityRiskScoreMetricLabel,
    });
  }, [entityData?.name, entityData?.risk?.calculated_level, entityType, entityId, spaceId]);

  const xsFontSize = useEuiFontSize('xxs').fontSize;
  const isPrivmonModifierEnabled = useIsExperimentalFeatureEnabled(
    'enableRiskScorePrivmonModifier'
  );
  const isWatchlistEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsWatchlistEnabled');
  const isNewEntityAnalyticsPage = useNewEntityAnalyticsPage();
  const rows = useMemo(
    () => getItems(entityData, isPrivmonModifierEnabled, isWatchlistEnabled),
    [entityData, isPrivmonModifierEnabled, isWatchlistEnabled]
  );

  const onToggle = useCallback(
    (isOpen: boolean) => {
      telemetry.reportEvent(EntityEventTypes.ToggleRiskSummaryClicked, {
        entity: entityType,
        action: isOpen ? 'show' : 'hide',
      });
    },
    [entityType, telemetry]
  );

  const casesAttachmentMetadata = useMemo(
    () => ({
      description: i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.riskSummary.casesAttachmentLabel',
        {
          defaultMessage:
            'Risk score for {entityType, select, user {user} other {host}} {entityName}',
          values: {
            entityName: entityData?.name,
            entityType,
          },
        }
      ),
    }),
    [entityData?.name, entityType]
  );

  const riskDataTimestamp = riskData?.['@timestamp'];
  const timerange = useMemo(() => {
    const from = dateMath.parse(LAST_30_DAYS.from)?.toISOString() ?? LAST_30_DAYS.from;
    const to = dateMath.parse(LAST_30_DAYS.to)?.toISOString() ?? LAST_30_DAYS.to;
    return { from, to };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskDataTimestamp]); // Update the timerange whenever the risk score timestamp changes to include new entries

  const goToEntityInsightsTab = useCallback(
    (subTab?: RiskScoreLeftPanelSubTab) =>
      openDetailsPanel({ tab: EntityDetailsLeftPanelTab.RISK_INPUTS, subTab }),
    [openDetailsPanel]
  );

  const entityTabLink = useMemo(
    () => ({
      callback: () => goToEntityInsightsTab(RiskScoreLeftPanelSubTab.ENTITY),
      tooltip: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.showAllEntityRiskInputs"
          defaultMessage="Show all entity risk inputs"
        />
      ),
    }),
    [goToEntityInsightsTab]
  );

  const resolutionTabLink = useMemo(
    () => ({
      callback: () => goToEntityInsightsTab(RiskScoreLeftPanelSubTab.RESOLUTION),
      tooltip: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.showAllResolutionRiskInputs"
          defaultMessage="Show all resolution group risk inputs"
        />
      ),
    }),
    [goToEntityInsightsTab]
  );

  const hasResolutionGroup = entityRiskScores?.resolution.hasResolutionGroup ?? false;
  const resolutionTargetEntityId = entityRiskScores?.resolution.resolutionTargetEntityId;
  const resolutionRiskData =
    (entityResolutionRiskScore?.data && entityResolutionRiskScore.data.length > 0
      ? entityResolutionRiskScore.data[0]
      : undefined) ?? prefetchedResolutionRisk;
  const resolutionEntityData = getEntityData<T>(entityType, resolutionRiskData);
  const resolutionRows = useMemo(
    () => getItems(resolutionEntityData, isPrivmonModifierEnabled, isWatchlistEnabled),
    [resolutionEntityData, isPrivmonModifierEnabled, isWatchlistEnabled]
  );
  const showResolutionRiskSummary = hasResolutionGroup && Boolean(resolutionEntityData?.risk);
  const showOnlyResolutionRisk = shouldShowOnlyResolutionRisk({
    enabled: isNewEntityAnalyticsPage,
    hasResolutionGroup,
    hasResolutionScore: Boolean(resolutionEntityData?.risk),
    resolutionLoading: entityResolutionRiskScore?.loading ?? false,
  });
  const showResolutionPanel = showResolutionRiskSummary || showOnlyResolutionRisk;
  const displayedUpdatedAt = showOnlyResolutionRisk
    ? resolutionRiskData?.['@timestamp']
    : riskData?.['@timestamp'];
  const resolutionLensAttributes = useMemo(() => {
    if (!resolutionTargetEntityId) {
      return undefined;
    }

    return getRiskScoreSummaryAttributes({
      severity: resolutionEntityData?.risk?.calculated_level,
      query: `${entityType}.risk.id_value: "${resolutionTargetEntityId}" AND ${entityType}.risk.score_type: "resolution"`,
      spaceId,
      riskEntity: entityType,
      dataSource: 'risk_index',
      metricLabel: showOnlyResolutionRisk
        ? entityRiskScoreMetricLabel
        : resolutionRiskScoreMetricLabel,
    });
  }, [
    entityType,
    resolutionEntityData?.risk?.calculated_level,
    resolutionTargetEntityId,
    showOnlyResolutionRisk,
    spaceId,
  ]);
  const resolutionCasesAttachmentMetadata = useMemo(
    () => ({
      description: showOnlyResolutionRisk
        ? entityCaseAttachmentLabel(entityType, resolutionEntityData?.name)
        : resolutionCaseAttachmentLabel(entityType, resolutionEntityData?.name),
    }),
    [entityType, resolutionEntityData?.name, showOnlyResolutionRisk]
  );
  const resolutionTimerange = useMemo(() => {
    const from = dateMath.parse(LAST_30_DAYS.from)?.toISOString() ?? LAST_30_DAYS.from;
    const to = dateMath.parse(LAST_30_DAYS.to)?.toISOString() ?? LAST_30_DAYS.to;
    return { from, to };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolutionRiskData?.['@timestamp']]);

  const panelIconType = !isPreviewMode && !hideHeaderIcon ? 'chevronLimitLeft' : undefined;
  const entityPanelTitle = (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.entityRiskInputs"
      defaultMessage="Entity risk contributions"
    />
  );
  const resolutionPanelTitle = (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.resolutionRiskInputs"
      defaultMessage="Resolution group risk contributions"
    />
  );
  const entityInspectTitle = (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.inspectVisualizationTitle"
      defaultMessage="Risk Summary Visualization"
    />
  );
  const resolutionInspectTitle = (
    <FormattedMessage
      id="xpack.securitySolution.flyout.entityDetails.inspectResolutionVisualizationTitle"
      defaultMessage="Resolution Risk Summary Visualization"
    />
  );
  const entityTableCaption = i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.riskSummaryTableCaption',
    {
      defaultMessage: 'Risk summary for {entity}',
      values: { entity: capitalize(entityType) },
    }
  );
  const resolutionTableCaption = i18n.translate(
    'xpack.securitySolution.flyout.entityDetails.resolutionRiskSummaryTableCaption',
    {
      defaultMessage: 'Resolution risk summary for {entity}',
      values: { entity: capitalize(entityType) },
    }
  );

  return (
    <EuiAccordion
      onToggle={onToggle}
      initialIsOpen
      id={'risk_summary'}
      buttonProps={{
        css: css`
          color: ${euiTheme.colors.primary};
        `,
      }}
      buttonContent={
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.securitySolution.flyout.riskScore.title"
              defaultMessage="Risk score"
            />
          </h3>
        </EuiTitle>
      }
      extraAction={
        <span
          data-test-subj="risk-summary-updatedAt"
          css={css`
            font-size: ${xsFontSize};
          `}
        >
          {displayedUpdatedAt && (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskUpdatedTime"
              defaultMessage="Updated {time}"
              values={{
                time: (
                  <FormattedRelativePreferenceDate
                    value={displayedUpdatedAt}
                    dateFormat="MMM D, YYYY"
                    relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                  />
                ),
              }}
            />
          )}
        </span>
      }
    >
      <EuiSpacer size="m" />

      {/* Show individual risk score when USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG is disabled or when only individual score is available */}
      {!showOnlyResolutionRisk && (
        <RiskContributionsPanel
          data-test-subj="entityRiskInputs"
          title={entityPanelTitle}
          link={entityTabLink}
          iconType={panelIconType}
          visualization={{
            isReady: Boolean(riskData),
            id: 'RiskSummary-risk_score_metric',
            lensAttributes,
            timerange,
            inspectTitle: entityInspectTitle,
            casesAttachmentMetadata,
          }}
          table={{
            testSubj: 'risk-summary-table',
            caption: entityTableCaption,
            items: rows,
            loading:
              riskScoreData.loading ||
              (entityBaseRiskScore?.loading ?? false) ||
              recalculatingScore,
            inspectQueryId: queryId,
          }}
        />
      )}
      {showResolutionPanel && (
        <>
          {!showOnlyResolutionRisk && <EuiSpacer size="m" />}
          {/* Show resolution risk score when USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG is enabled or when resolution score is available */}
          <RiskContributionsPanel
            data-test-subj="resolutionRiskInputs"
            title={showOnlyResolutionRisk ? entityPanelTitle : resolutionPanelTitle}
            link={resolutionTabLink}
            iconType={panelIconType}
            visualization={{
              isReady: Boolean(resolutionRiskData),
              id: 'RiskSummary-resolution_risk_score_metric',
              lensAttributes: resolutionLensAttributes,
              timerange: resolutionTimerange,
              inspectTitle: showOnlyResolutionRisk ? entityInspectTitle : resolutionInspectTitle,
              casesAttachmentMetadata: resolutionCasesAttachmentMetadata,
            }}
            table={{
              testSubj: 'resolution-risk-summary-table',
              caption: showOnlyResolutionRisk ? entityTableCaption : resolutionTableCaption,
              items: resolutionRows,
              loading: (entityResolutionRiskScore?.loading ?? false) || recalculatingScore,
              inspectQueryId: showOnlyResolutionRisk ? queryId : undefined,
            }}
          />
        </>
      )}
      <EuiSpacer size="s" />
    </EuiAccordion>
  );
};

export const FlyoutRiskSummary = React.memo(
  FlyoutRiskSummaryComponent
) as typeof FlyoutRiskSummaryComponent & { displayName: string }; // This is needed to male React.memo work with generic
FlyoutRiskSummary.displayName = 'RiskSummary';
