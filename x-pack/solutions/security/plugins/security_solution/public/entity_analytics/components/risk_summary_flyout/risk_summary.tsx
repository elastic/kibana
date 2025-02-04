/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import {
  useEuiTheme,
  EuiAccordion,
  EuiTitle,
  EuiSpacer,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash/fp';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { EntityDetailsLeftPanelTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { ONE_WEEK_IN_HOURS } from '../../../flyout/entity_details/shared/constants';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { ExpandablePanel } from '../../../flyout/shared/components/expandable_panel';
import type { RiskScoreState } from '../../api/hooks/use_risk_score';
import { getRiskScoreSummaryAttributes } from '../../lens_attributes/risk_score_summary';

import {
  columnsArray,
  getEntityData,
  getItems,
  LAST_30_DAYS,
  LENS_VISUALIZATION_HEIGHT,
  LENS_VISUALIZATION_MIN_WIDTH,
  SUMMARY_TABLE_MIN_WIDTH,
} from './common';
import { EntityEventTypes } from '../../../common/lib/telemetry';

export interface RiskSummaryProps<T extends EntityType> {
  riskScoreData: RiskScoreState<T>;
  entityType: T;
  recalculatingScore: boolean;
  queryId: string;
  openDetailsPanel: (path: EntityDetailsPath) => void;
  isLinkEnabled: boolean;
  isPreviewMode?: boolean;
}

const FlyoutRiskSummaryComponent = <T extends EntityType>({
  riskScoreData,
  entityType,
  recalculatingScore,
  queryId,
  openDetailsPanel,
  isLinkEnabled,
  isPreviewMode,
}: RiskSummaryProps<T>) => {
  const { telemetry } = useKibana().services;
  const { data } = riskScoreData;
  const riskData = data && data.length > 0 ? data[0] : undefined;
  const entityData = getEntityData<T>(entityType, riskData);
  const { euiTheme } = useEuiTheme();
  const lensAttributes = useMemo(() => {
    const entityName = entityData?.name ?? '';
    const fieldName = EntityTypeToIdentifierField[entityType];

    return getRiskScoreSummaryAttributes({
      severity: entityData?.risk?.calculated_level,
      query: `${fieldName}: ${entityName}`,
      spaceId: 'default',
      riskEntity: entityType,
      // TODO: add in riskColors when severity palette agreed on.
      // https://github.com/elastic/security-team/issues/11516 hook - https://github.com/elastic/kibana/pull/206276
    });
  }, [entityData?.name, entityData?.risk?.calculated_level, entityType]);
  const xsFontSize = useEuiFontSize('xxs').fontSize;
  const rows = useMemo(() => getItems(entityData), [entityData]);

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
              id="xpack.securitySolution.flyout.entityDetails.title"
              defaultMessage="{entity} risk summary"
              values={{ entity: capitalize(entityType) }}
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
          {riskData && (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskUpdatedTime"
              defaultMessage="Updated {time}"
              values={{
                time: (
                  <FormattedRelativePreferenceDate
                    value={riskData['@timestamp']}
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

      <ExpandablePanel
        data-test-subj="riskInputs"
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskInputs"
              defaultMessage="View risk contributions"
            />
          ),
          link: riskScoreData.loading
            ? undefined
            : {
                callback: isLinkEnabled
                  ? () => openDetailsPanel({ tab: EntityDetailsLeftPanelTab.RISK_INPUTS })
                  : undefined,
                tooltip: (
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.showAllRiskInputs"
                    defaultMessage="Show all risk inputs"
                  />
                ),
              },
          iconType: !isPreviewMode ? 'arrowStart' : undefined,
        }}
        expand={{
          expandable: false,
        }}
      >
        <EuiFlexGroup gutterSize="m" direction="row" wrap>
          <EuiFlexItem grow={1}>
            <div
              // Improve Visualization loading state by predefining the size
              // Set min-width for a fluid layout
              css={css`
                height: ${LENS_VISUALIZATION_HEIGHT}px;
                min-width: ${LENS_VISUALIZATION_MIN_WIDTH}px;
              `}
            >
              {riskData && (
                <VisualizationEmbeddable
                  applyGlobalQueriesAndFilters={false}
                  applyPageAndTabsFilters={false}
                  lensAttributes={lensAttributes}
                  id={`RiskSummary-risk_score_metric`}
                  timerange={timerange}
                  width={'100%'}
                  height={LENS_VISUALIZATION_HEIGHT}
                  disableOnClickFilter
                  inspectTitle={
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.inspectVisualizationTitle"
                      defaultMessage="Risk Summary Visualization"
                    />
                  }
                  casesAttachmentMetadata={casesAttachmentMetadata}
                />
              )}
            </div>
          </EuiFlexItem>
          <EuiFlexItem
            grow={3}
            css={css`
              min-width: ${SUMMARY_TABLE_MIN_WIDTH}px;
            `}
          >
            <InspectButtonContainer>
              <div
                // Anchors the position absolute inspect button (nearest positioned ancestor)
                css={css`
                  position: relative;
                `}
              >
                <div
                  // Position the inspect button above the table
                  css={css`
                    position: absolute;
                    right: 0;
                    top: -${euiTheme.size.base};
                  `}
                >
                  <InspectButton
                    queryId={queryId}
                    title={
                      <FormattedMessage
                        id="xpack.securitySolution.flyout.entityDetails.inspectTableTitle"
                        defaultMessage="Risk Summary Table"
                      />
                    }
                  />
                </div>
                <EuiBasicTable
                  data-test-subj="risk-summary-table"
                  responsiveBreakpoint={false}
                  columns={columnsArray}
                  items={rows}
                  compressed
                  loading={riskScoreData.loading || recalculatingScore}
                />
              </div>
            </InspectButtonContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ExpandablePanel>
      <EuiSpacer size="s" />
    </EuiAccordion>
  );
};

export const FlyoutRiskSummary = React.memo(
  FlyoutRiskSummaryComponent
) as typeof FlyoutRiskSummaryComponent & { displayName: string }; // This is needed to male React.memo work with generic
FlyoutRiskSummary.displayName = 'RiskSummary';
