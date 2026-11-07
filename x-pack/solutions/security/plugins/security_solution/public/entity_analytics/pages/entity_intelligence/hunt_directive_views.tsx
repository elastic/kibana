/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn, EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { HuntSeverity } from './hunt_result_presentation';
import type {
  DirectiveHuntArtifact,
  GroundedAlertTable,
  GroundedArtifactData,
  GroundedAttackPath,
  GroundedEntityCard,
  GroundedMetricRow,
  GroundedMitreStrip,
  GroundedRiskGauge,
  GroundedSankey,
} from './hunt_directive_artifacts';

const severityPaletteColor = (
  euiTheme: EuiThemeComputed,
  severity: HuntSeverity | undefined
): string => {
  const { danger, risk, warning, neutral, unknown } = euiTheme.colors.severity;
  switch (severity) {
    case 'critical':
      return danger;
    case 'high':
      return risk;
    case 'medium':
      return warning;
    case 'low':
      return neutral;
    default:
      return unknown;
  }
};

const severityBadgeColor = (
  severity: HuntSeverity | undefined
): 'danger' | 'warning' | 'primary' | 'hollow' => {
  if (severity === 'critical') return 'danger';
  if (severity === 'high' || severity === 'medium') return 'warning';
  if (severity === 'low') return 'primary';
  return 'hollow';
};

const iconForDirective = (type: DirectiveHuntArtifact['directiveType']): string => {
  switch (type) {
    case 'entity_card':
      return 'user';
    case 'alert_table':
      return 'bell';
    case 'risk_gauge':
      return 'visGauge';
    case 'mitre_strip':
      return 'crosshair';
    case 'attack_path':
      return 'graphApp';
    case 'sankey':
      return 'sortRight';
    case 'metric_row':
      return 'stats';
    default:
      return 'visualizeApp';
  }
};

/**
 * Consistent "attachment" card wrapper for every AI-directed artifact: an icon,
 * a title, a subtle provenance line, and the grounded body. Keeps spacing and
 * treatment uniform so interleaving artifacts with the narrative reads as one
 * premium surface.
 */
export const HuntArtifactCard: React.FC<{
  icon: string;
  title: string;
  provenance: string;
  children: React.ReactNode;
  'data-test-subj'?: string;
}> = ({ icon, title, provenance, children, 'data-test-subj': dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();
  const cardStyle = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.emptyShade};
    padding: ${euiTheme.size.m};
    min-width: 0;
  `;
  const headerStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    margin-bottom: ${euiTheme.size.s};
  `;
  const titleStyle = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textParagraph};
  `;
  return (
    <div css={cardStyle} data-test-subj={dataTestSubj ?? 'entityIntelligenceHuntArtifactCard'}>
      <div css={headerStyle}>
        <EuiIcon type={icon} color="primary" aria-hidden={true} />
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" css={titleStyle}>
              <span>{title}</span>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <span>{provenance}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      {children}
    </div>
  );
};

const EntityCardView: React.FC<{ data: GroundedEntityCard }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const gridStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: ${euiTheme.size.s};
  `;
  const cellStyle = css`
    min-width: 0;
  `;
  const valueStyle = css`
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.textHeading};
  `;
  const facts: Array<{ label: string; value: string }> = [];
  if (data.entityType) {
    facts.push({
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.entityCard.type',
        { defaultMessage: 'Type' }
      ),
      value: data.entityType,
    });
  }
  if (data.riskLevel) {
    facts.push({
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.entityCard.risk',
        { defaultMessage: 'Risk' }
      ),
      value:
        data.riskScore !== undefined ? `${data.riskLevel} (${data.riskScore})` : data.riskLevel,
    });
  }
  if (data.criticality) {
    facts.push({
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.entityCard.criticality',
        { defaultMessage: 'Criticality' }
      ),
      value: data.criticality,
    });
  }
  if (data.alertCount !== undefined) {
    facts.push({
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.entityCard.alerts',
        { defaultMessage: 'Alerts' }
      ),
      value: String(data.alertCount),
    });
  }
  return (
    <div>
      <EuiText size="s">
        <strong>{data.name}</strong>
      </EuiText>
      <EuiSpacerXs />
      <div css={gridStyle}>
        {facts.map((fact) => (
          <div key={fact.label} css={cellStyle}>
            <EuiText size="xs" color="subdued">
              <span>{fact.label}</span>
            </EuiText>
            <EuiText size="s" css={valueStyle}>
              <span>{fact.value}</span>
            </EuiText>
          </div>
        ))}
      </div>
    </div>
  );
};

const EuiSpacerXs: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        height: ${euiTheme.size.xs};
      `}
    />
  );
};

const AlertTableView: React.FC<{ data: GroundedAlertTable }> = ({ data }) => {
  const columns: Array<EuiBasicTableColumn<GroundedAlertTable['rows'][number]>> = [
    {
      field: 'rule',
      name: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.alertTable.rule',
        { defaultMessage: 'Rule' }
      ),
      truncateText: true,
    },
    {
      field: 'severity',
      name: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.alertTable.severity',
        { defaultMessage: 'Severity' }
      ),
      width: '110px',
      render: (severity: HuntSeverity | undefined) =>
        severity ? (
          <EuiBadge color={severityBadgeColor(severity)}>{severity}</EuiBadge>
        ) : (
          <>{'—'}</>
        ),
    },
    {
      field: 'entity',
      name: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.alertTable.entity',
        { defaultMessage: 'Entity' }
      ),
      truncateText: true,
      render: (entity: string | undefined) => <>{entity ?? '—'}</>,
    },
    {
      field: 'timestamp',
      name: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.alertTable.time',
        { defaultMessage: 'Time' }
      ),
      width: '180px',
      render: (timestamp: string | undefined) => (
        <>{timestamp ? new Date(timestamp).toLocaleString() : '—'}</>
      ),
    },
  ];
  return (
    <EuiBasicTable
      tableCaption={i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.alertTable.caption',
        { defaultMessage: 'Alerts supporting this hunt' }
      )}
      items={data.rows}
      columns={columns}
      tableLayout="auto"
      compressed
      data-test-subj="entityIntelligenceHuntArtifactAlertTable"
    />
  );
};

const RiskGaugeView: React.FC<{ data: GroundedRiskGauge }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const clamped = Math.max(0, Math.min(100, data.score));
  const color =
    clamped >= 90
      ? euiTheme.colors.severity.danger
      : clamped >= 70
      ? euiTheme.colors.severity.risk
      : clamped >= 40
      ? euiTheme.colors.severity.warning
      : euiTheme.colors.severity.neutral;
  const trackStyle = css`
    position: relative;
    height: ${euiTheme.size.s};
    border-radius: ${euiTheme.size.s};
    background: ${euiTheme.colors.backgroundBaseSubdued};
    overflow: hidden;
    margin-top: ${euiTheme.size.xs};
  `;
  const fillStyle = css`
    width: ${clamped}%;
    height: 100%;
    background: ${color};
  `;
  return (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="m">
            <strong
              css={css`
                font-size: ${euiTheme.size.l};
                color: ${color};
              `}
            >
              {clamped}
            </strong>
          </EuiText>
        </EuiFlexItem>
        {data.level ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <span>{data.level}</span>
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <div css={trackStyle} data-test-subj="entityIntelligenceHuntArtifactRiskGauge">
        <div css={fillStyle} />
      </div>
    </div>
  );
};

const MitreStripView: React.FC<{ data: GroundedMitreStrip }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const rowStyle = css`
    display: flex;
    flex-wrap: wrap;
    gap: ${euiTheme.size.xs};
  `;
  return (
    <div css={rowStyle} data-test-subj="entityIntelligenceHuntArtifactMitreStrip">
      {data.techniques.map((technique) => (
        <EuiToolTip
          key={`${technique.id ?? ''}:${technique.name}`}
          content={i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.mitre.count',
            {
              defaultMessage: '{count, plural, one {# occurrence} other {# occurrences}}',
              values: { count: technique.count },
            }
          )}
        >
          <EuiBadge tabIndex={0} color="hollow">
            {technique.id ? `${technique.id} · ` : ''}
            {technique.name}
          </EuiBadge>
        </EuiToolTip>
      ))}
    </div>
  );
};

const AttackPathView: React.FC<{ data: GroundedAttackPath }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const wrapperStyle = css`
    display: flex;
    align-items: stretch;
    flex-wrap: wrap;
    gap: ${euiTheme.size.xs};
  `;
  const stepStyle = (severity: HuntSeverity | undefined) => css`
    min-width: 0;
    flex: 1 1 130px;
    padding: ${euiTheme.size.s};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain};
    border-left: ${euiTheme.border.width.thick} solid ${severityPaletteColor(euiTheme, severity)};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.primary, 0.04)};
  `;
  return (
    <div css={wrapperStyle} data-test-subj="entityIntelligenceHuntArtifactAttackPath">
      {data.steps.map((step, index) => (
        <React.Fragment key={`${step.label}:${index}`}>
          <div css={stepStyle(step.severity)}>
            <EuiText size="xs" color="subdued">
              <span>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.attackPath.step',
                  { defaultMessage: 'Step {n}', values: { n: index + 1 } }
                )}
              </span>
            </EuiText>
            <EuiText size="s">
              <strong>{step.label}</strong>
            </EuiText>
            {step.detail ? (
              <EuiText size="xs" color="subdued">
                <span>{step.detail}</span>
              </EuiText>
            ) : null}
          </div>
          {index < data.steps.length - 1 ? (
            <EuiIcon
              type="sortRight"
              color="subdued"
              css={css`
                align-self: center;
              `}
              aria-hidden={true}
            />
          ) : null}
        </React.Fragment>
      ))}
    </div>
  );
};

const SankeyView: React.FC<{ data: GroundedSankey }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const max = Math.max(...data.links.map((link) => link.value), 1);
  const rowStyle = css`
    display: grid;
    grid-template-columns: minmax(80px, 1fr) auto minmax(80px, 1fr);
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.xs} 0;
  `;
  const nodeStyle = css`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  const flowStyle = (value: number) => css`
    height: ${Math.max(2, Math.round((value / max) * 12))}px;
    min-width: ${euiTheme.size.xl};
    border-radius: ${euiTheme.size.xs};
    background: ${transparentize(euiTheme.colors.primary, 0.5)};
  `;
  return (
    <div data-test-subj="entityIntelligenceHuntArtifactSankey">
      {data.links.map((link) => (
        <div key={`${link.source}→${link.target}`} css={rowStyle}>
          <EuiText size="s" css={nodeStyle}>
            <span title={link.source}>{link.source}</span>
          </EuiText>
          <EuiToolTip
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.aiHunt.artifact.sankey.flow',
              {
                defaultMessage: '{count, plural, one {# event} other {# events}}',
                values: { count: link.value },
              }
            )}
          >
            <div tabIndex={0} css={flowStyle(link.value)} />
          </EuiToolTip>
          <EuiText size="s" css={nodeStyle}>
            <span title={link.target}>{link.target}</span>
          </EuiText>
        </div>
      ))}
    </div>
  );
};

const MetricRowView: React.FC<{ data: GroundedMetricRow }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const rowStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: ${euiTheme.size.s};
  `;
  const valueStyle = css`
    font-size: ${euiTheme.size.l};
    font-weight: ${euiTheme.font.weight.bold};
    color: ${euiTheme.colors.textHeading};
  `;
  return (
    <div css={rowStyle} data-test-subj="entityIntelligenceHuntArtifactMetricRow">
      {data.metrics.map((metric) => (
        <div key={metric.label}>
          <EuiText css={valueStyle}>
            <span>{metric.value}</span>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <span>{metric.label}</span>
          </EuiText>
        </div>
      ))}
    </div>
  );
};

const DirectiveBody: React.FC<{ data: GroundedArtifactData }> = ({ data }) => {
  switch (data.type) {
    case 'entity_card':
      return <EntityCardView data={data} />;
    case 'alert_table':
      return <AlertTableView data={data} />;
    case 'risk_gauge':
      return <RiskGaugeView data={data} />;
    case 'mitre_strip':
      return <MitreStripView data={data} />;
    case 'attack_path':
      return <AttackPathView data={data} />;
    case 'sankey':
      return <SankeyView data={data} />;
    case 'metric_row':
      return <MetricRowView data={data} />;
    default:
      return null;
  }
};

/**
 * Renders a single grounded AI-directed artifact inside the consistent
 * attachment card. Every value shown originates from real ES data (the
 * grounding step dropped anything it could not resolve), so there is no
 * fabricated-data path here.
 */
export const HuntDirectiveArtifactView: React.FC<{ artifact: DirectiveHuntArtifact }> = ({
  artifact,
}) => (
  <HuntArtifactCard
    icon={iconForDirective(artifact.directiveType)}
    title={artifact.data.title}
    provenance={artifact.provenance}
    data-test-subj={`entityIntelligenceHuntArtifact-${artifact.directiveType}`}
  >
    <DirectiveBody data={artifact.data} />
  </HuntArtifactCard>
);
