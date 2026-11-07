/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../components/entity_store/entity_icon_by_type';
import type { IntelligenceEntity, RiskLevel } from './common';
import { getRiskLevelColor } from './common';
import type { ConcentrationFilter } from './overview_metrics';
import { filterExposureLeaders } from './overview_metrics';

const TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.user]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.usersLabel',
    { defaultMessage: 'Users' }
  ),
  [EntityType.host]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.hostsLabel',
    { defaultMessage: 'Hosts' }
  ),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.servicesLabel',
    { defaultMessage: 'Services' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.otherTypeLabel',
    { defaultMessage: 'Other' }
  ),
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  Critical: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.criticalLabel',
    { defaultMessage: 'Critical' }
  ),
  High: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.highLabel',
    { defaultMessage: 'High' }
  ),
  Moderate: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.moderateLabel',
    { defaultMessage: 'Moderate' }
  ),
  Low: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.lowLabel',
    { defaultMessage: 'Low' }
  ),
  Unknown: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.unknownLabel',
    { defaultMessage: 'Unknown' }
  ),
};

interface ExposureLeadersProps {
  entities: readonly IntelligenceEntity[];
  isLoading: boolean;
  filter: ConcentrationFilter | undefined;
  onClearFilter: () => void;
  onSelect: (entity: IntelligenceEntity) => void;
  onViewAllEntities: () => void;
}

export const ExposureLeaders: React.FC<ExposureLeadersProps> = ({
  entities,
  isLoading,
  filter,
  onClearFilter,
  onSelect,
  onViewAllEntities,
}) => {
  const { euiTheme } = useEuiTheme();
  const leaders = useMemo(() => filterExposureLeaders(entities, filter), [entities, filter]);

  const sectionStyle = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    padding: ${euiTheme.size.l};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${transparentize(euiTheme.colors.emptyShade, 0.74)};
    box-shadow: inset 0 0 0 1px ${transparentize(euiTheme.colors.borderBasePlain, 0.55)};
  `;
  const headerStyle = css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${euiTheme.size.s};
  `;
  const listStyle = css`
    flex: 1;
  `;
  const rowStyle = (color: string) => css`
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    align-items: center;
    gap: ${euiTheme.size.m};
    width: 100%;
    padding: ${euiTheme.size.m} 0;
    border: 0;
    border-bottom: ${euiTheme.border.thin};
    background: transparent;
    color: ${euiTheme.colors.textParagraph};
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      color: ${euiTheme.colors.primaryText};
      outline: none;

      [data-rank] {
        color: ${color};
        border-color: ${color};
      }
    }
  `;
  const rankStyle = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: ${euiTheme.border.thin};
    border-radius: 50%;
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.bold};
    font-variant-numeric: tabular-nums;
  `;
  const nameStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    min-width: 0;
  `;
  const nameTextStyle = css`
    overflow: hidden;
    color: ${euiTheme.colors.textHeading};
    font-size: ${euiTheme.size.m};
    font-weight: ${euiTheme.font.weight.semiBold};
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const metaStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    margin-top: ${euiTheme.size.xs};
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
  `;
  const scoreStyle = (color: string) => css`
    color: ${color};
    font-size: 20px;
    font-weight: ${euiTheme.font.weight.bold};
    font-variant-numeric: tabular-nums;
  `;

  const filterLabel =
    filter?.kind === 'type'
      ? TYPE_LABELS[filter.value]
      : filter?.kind === 'level'
      ? RISK_LEVEL_LABELS[filter.value]
      : undefined;

  return (
    <section css={sectionStyle} data-test-subj="entityIntelligenceExposureLeaders">
      <div css={headerStyle}>
        <div>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.title',
                { defaultMessage: 'Exposure leaders' }
              )}
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p>
              {filterLabel
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.filteredDescription',
                    {
                      defaultMessage: 'Highest normalized risk within the {filter} focus.',
                      values: { filter: filterLabel },
                    }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.description',
                    { defaultMessage: 'Highest normalized risk in the current entity snapshot.' }
                  )}
            </p>
          </EuiText>
        </div>
        {filterLabel ? (
          <EuiBadge
            color="hollow"
            iconType="cross"
            iconOnClick={onClearFilter}
            iconOnClickAriaLabel={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.clearFilterAriaLabel',
              { defaultMessage: 'Clear exposure filter' }
            )}
          >
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.filterBadgeLabel',
              {
                defaultMessage: 'Focus: {filter}',
                values: { filter: filterLabel },
              }
            )}
          </EuiBadge>
        ) : null}
      </div>

      <EuiSpacer size="m" />
      <div css={listStyle}>
        {isLoading ? (
          <EuiSkeletonText lines={6} />
        ) : leaders.length > 0 ? (
          leaders.map((entity, index) => {
            const color = getRiskLevelColor(euiTheme, entity.riskLevel);
            return (
              <button
                key={entity.id}
                type="button"
                css={rowStyle(color)}
                onClick={() => onSelect(entity)}
                data-test-subj={`entityIntelligenceExposureLeader-${index}`}
              >
                <span css={rankStyle} data-rank>
                  {index + 1}
                </span>
                <span>
                  <span css={nameStyle}>
                    <EuiIcon
                      type={EntityIconByType[entity.type]}
                      color="subdued"
                      aria-hidden={true}
                    />
                    <span css={nameTextStyle} title={entity.name}>
                      {entity.name}
                    </span>
                  </span>
                  <span css={metaStyle}>
                    <span>{TYPE_LABELS[entity.type]}</span>
                    <span>{'·'}</span>
                    <span>{RISK_LEVEL_LABELS[entity.riskLevel]}</span>
                  </span>
                </span>
                <span css={scoreStyle(color)}>
                  {entity.riskScoreNorm === undefined ? '—' : Math.round(entity.riskScoreNorm)}
                </span>
              </button>
            );
          })
        ) : (
          <div
            css={css`
              display: flex;
              align-items: flex-start;
              gap: ${euiTheme.size.s};
              padding: ${euiTheme.size.l} 0;
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            <EuiIcon type="search" color="subdued" aria-hidden={true} />
            <EuiText size="s" color="subdued">
              <p>
                {filterLabel
                  ? i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.filteredEmptyDescription',
                      { defaultMessage: 'No exposure leaders match this focus.' }
                    )
                  : i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.emptyDescription',
                      { defaultMessage: 'No entities are available in the current snapshot.' }
                    )}
              </p>
            </EuiText>
          </div>
        )}
      </div>

      <EuiSpacer size="m" />
      <EuiButtonEmpty size="s" iconType="sortRight" flush="left" onClick={onViewAllEntities}>
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.overview.exposureLeaders.viewAllLinkText',
          { defaultMessage: 'View all entities' }
        )}
      </EuiButtonEmpty>
    </section>
  );
};
