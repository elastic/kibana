/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiIcon,
  EuiIconTip,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getAlertSeverityColor } from './common';
import type { AttackMatrixColumn, AttackMatrixModel } from './overview_metrics';
import type { MaterialAlertSeverity, TechniqueCoverage } from './hooks/use_tactic_coverage';
import { TOTAL_MITRE_TACTICS } from './hooks/use_tactic_coverage';
import { staggeredEntrance } from './animations';

export interface AttackTechniqueDrill {
  techniqueId: string | undefined;
  techniqueName: string;
  tacticName: string;
}

interface AttackSurfaceCoverageProps {
  matrix: AttackMatrixModel;
  isLoading: boolean;
  isError: boolean;
  onDrillTechnique: (technique: AttackTechniqueDrill) => void;
}

const SEVERITY_LABELS: Record<MaterialAlertSeverity, string> = {
  critical: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.severity.critical',
    { defaultMessage: 'Critical' }
  ),
  high: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.severity.high',
    { defaultMessage: 'High' }
  ),
};

/**
 * Renders a live MITRE ATT&CK matrix. Every canonical enterprise tactic is a
 * kill-chain-ordered column; observed techniques are the cells within each
 * column and their fill intensity tracks alert volume against the busiest
 * technique. Empty columns expose coverage gaps. Every value is a real alert
 * count aggregated by {@link useTacticCoverage}; nothing is modeled, and the
 * matrix renders no cells while loading or on error.
 */
export const AttackSurfaceCoverage: React.FC<AttackSurfaceCoverageProps> = ({
  matrix,
  isLoading,
  isError,
  onDrillTechnique,
}) => {
  const { euiTheme } = useEuiTheme();
  const { columns, observedTacticCount, observedTechniqueCount, taggedAlertCount, maxCellCount } =
    matrix;

  const sectionStyle = css`
    padding: ${euiTheme.size.l};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${transparentize(euiTheme.colors.emptyShade, 0.74)};
    box-shadow: inset 0 0 0 1px ${transparentize(euiTheme.colors.borderBasePlain, 0.55)};
  `;
  const headerStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;
  const matrixScrollStyle = css`
    display: flex;
    gap: ${euiTheme.size.s};
    overflow-x: auto;
    padding-bottom: ${euiTheme.size.s};
    scrollbar-width: thin;
  `;
  const columnStyle = (isObserved: boolean) => css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    flex: 0 0 auto;
    width: 132px;
    opacity: ${isObserved ? 1 : 0.55};
  `;
  const columnHeaderStyle = (isObserved: boolean) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.xs};
    min-height: ${euiTheme.size.xl};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(
      isObserved ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain,
      isObserved ? 0.08 : 0.9
    )};
    color: ${euiTheme.colors.textHeading};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
  `;
  const columnHeaderNameStyle = css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const cellStyle = (technique: TechniqueCoverage) => {
    const severityColor = getAlertSeverityColor(euiTheme, technique.topSeverity);
    const intensity = maxCellCount > 0 ? technique.alertCount / maxCellCount : 0;
    return css`
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      padding: ${euiTheme.size.xs} ${euiTheme.size.s};
      border: ${euiTheme.border.width.thin} solid ${transparentize(severityColor, 0.45)};
      border-left: ${euiTheme.size.xxs} solid ${severityColor};
      border-radius: ${euiTheme.border.radius.small};
      /* Fill tracks alert volume so the busiest techniques read hottest. */
      background: ${transparentize(severityColor, 0.92 - intensity * 0.55)};
      color: ${euiTheme.colors.textHeading};
      text-align: left;
      cursor: pointer;
      transition: border-color ${euiTheme.animation.fast} ease,
        transform ${euiTheme.animation.fast} ease;

      &:hover,
      &:focus-visible {
        border-color: ${severityColor};
        transform: translateY(-1px);
        outline: none;
      }
    `;
  };
  const cellTitleStyle = css`
    overflow: hidden;
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const cellMetaStyle = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${euiTheme.size.xs};
    font-size: 10px;
    color: ${euiTheme.colors.textParagraph};
    font-variant-numeric: tabular-nums;
  `;
  const emptyColumnStyle = css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: ${euiTheme.size.xxl};
    border: ${euiTheme.border.width.thin} dashed
      ${transparentize(euiTheme.colors.borderBasePlain, 0.4)};
    border-radius: ${euiTheme.border.radius.small};
    color: ${euiTheme.colors.textSubdued};
    font-size: 10px;
  `;
  const stateStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    color: ${euiTheme.colors.textSubdued};
    font-size: ${euiTheme.size.m};
  `;

  const renderColumn = (column: AttackMatrixColumn) => {
    const isObserved = column.alertCount > 0;
    return (
      <div key={column.tacticId} css={columnStyle(isObserved)}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.columnTooltip',
            {
              defaultMessage:
                '{tactic} ({id}) · {alerts, plural, =0 {No material-risk alerts} one {# material-risk alert} other {# material-risk alerts}} in the last 30 days.',
              values: {
                tactic: column.tacticName,
                id: column.tacticId,
                alerts: column.alertCount,
              },
            }
          )}
        >
          <div tabIndex={0} css={columnHeaderStyle(isObserved)}>
            <span css={columnHeaderNameStyle}>{column.tacticName}</span>
            {isObserved ? (
              <EuiBadge color="hollow">{column.alertCount.toLocaleString()}</EuiBadge>
            ) : null}
          </div>
        </EuiToolTip>
        {column.techniques.length > 0 ? (
          column.techniques.map((technique) => (
            <EuiToolTip
              key={`${column.tacticId}:${technique.techniqueId ?? technique.techniqueName}`}
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.cellTooltip',
                {
                  defaultMessage:
                    '{name}{id, select, undefined {} other { ({id})}} · {severity} · {alerts, plural, one {# material-risk alert} other {# material-risk alerts}} in the last 30 days. Select to review the alerts.',
                  values: {
                    name: technique.techniqueName,
                    id: technique.techniqueId ?? 'undefined',
                    severity: SEVERITY_LABELS[technique.topSeverity],
                    alerts: technique.alertCount,
                  },
                }
              )}
            >
              <button
                type="button"
                css={cellStyle(technique)}
                onClick={() =>
                  onDrillTechnique({
                    techniqueId: technique.techniqueId,
                    techniqueName: technique.techniqueName,
                    tacticName: column.tacticName,
                  })
                }
                data-test-subj="entityIntelligenceAttackMatrixCell"
              >
                <span css={cellTitleStyle}>{technique.techniqueName}</span>
                <span css={cellMetaStyle}>
                  <span>{technique.techniqueId ?? ''}</span>
                  <span>{technique.alertCount.toLocaleString()}</span>
                </span>
              </button>
            </EuiToolTip>
          ))
        ) : (
          <div css={emptyColumnStyle}>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.emptyColumnLabel',
              { defaultMessage: 'No activity' }
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      css={[sectionStyle, staggeredEntrance(4)]}
      data-test-subj="entityIntelligenceAttackSurfaceCoverage"
    >
      <div css={headerStyle}>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.title',
              { defaultMessage: 'ATT&CK coverage matrix' }
            )}
          </h2>
        </EuiTitle>
        <EuiIconTip
          type="info"
          content={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.tooltip',
            {
              defaultMessage:
                'MITRE ATT&CK tactics laid out in kill-chain order across high and critical detection alerts in the last 30 days. Each cell is a technique observed in the alert data; a hotter cell means more alerts. Empty columns are tactics with no observed activity. Coverage spans the {total} enterprise tactics.',
              values: { total: TOTAL_MITRE_TACTICS },
            }
          )}
        />
      </div>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p>
          {observedTacticCount > 0
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.summaryDescription',
                {
                  defaultMessage:
                    'Observed across {observed} of {total} tactics · {techniques, plural, one {# technique} other {# techniques}} · {alerts, plural, one {# material-risk alert} other {# material-risk alerts}}.',
                  values: {
                    observed: observedTacticCount,
                    total: TOTAL_MITRE_TACTICS,
                    techniques: observedTechniqueCount,
                    alerts: taggedAlertCount,
                  },
                }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.noCoverageDescription',
                {
                  defaultMessage:
                    'No high or critical alerts are tagged with a MITRE tactic in the last 30 days.',
                }
              )}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiSkeletonRectangle width="100%" height={140} borderRadius="m" />
      ) : isError ? (
        <div css={stateStyle}>
          <EuiIcon type="warning" color="warning" aria-hidden={true} />
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.errorDescription',
            { defaultMessage: 'Attack-surface coverage is unavailable right now.' }
          )}
        </div>
      ) : observedTacticCount === 0 ? (
        <div css={stateStyle}>
          <EuiIcon type="checkCircleFill" color="success" aria-hidden={true} />
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.attackSurface.clearDescription',
            { defaultMessage: 'No material-risk tactic activity to map.' }
          )}
        </div>
      ) : (
        <div css={matrixScrollStyle} role="grid">
          {columns.map(renderColumn)}
        </div>
      )}
    </section>
  );
};
