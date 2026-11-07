/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { externalAgentGrouping } from './ai_agents/external_agent_provider';
import type { ExecutiveBrief } from './structured_insight';
import { comparisonLabel } from './ai_agents/behavior_presentation';
import type {
  BriefSourceStatus,
  ExecutiveBriefAgentSnapshot,
  ExecutiveBriefCoverage,
} from './executive_brief_agents';
import {
  briefCoverageSourceLabel,
  briefCoverageStatusLabel,
  briefFindingDescription,
  briefLimitationLabel,
  briefProviderStatusLabel,
} from './executive_brief_presentation';
import type {
  BriefTopRisk,
  ExecutiveKpi,
  KillChainCoverage,
  RiskBandDatum,
  RiskTypeDatum,
} from './overview_metrics';
import {
  BAND_LABELS,
  ENTITY_TYPE_LABELS,
  KPI_LABELS,
  formatCriticality,
} from './executive_brief_metrics';

const EXPORT_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.exportPdfButtonLabel',
  { defaultMessage: 'Export PDF' }
);

const DOCUMENT_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.documentTitle',
  { defaultMessage: 'Executive brief' }
);

const NARRATIVE_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.narrativeHeading',
  { defaultMessage: 'Executive assessment' }
);

const IMPACT_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.impactHeading',
  { defaultMessage: 'Business impact' }
);

const DECISIONS_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.decisionsHeading',
  { defaultMessage: 'Decisions and next steps' }
);

const KPI_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.kpiHeading',
  { defaultMessage: 'Key metrics' }
);

const RISK_MIX_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.riskMixHeading',
  { defaultMessage: 'Material-risk mix' }
);

const TOP_RISKS_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.topRisksHeading',
  { defaultMessage: 'Top exposed entities' }
);

const RISK_BY_TYPE_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.riskByTypeHeading',
  { defaultMessage: 'Material risk by type' }
);

const KILL_CHAIN_HEADING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.killChainHeading',
  { defaultMessage: 'Observed attack tactics' }
);

const NO_KILL_CHAIN_TEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.noKillChainText',
  { defaultMessage: 'No MITRE tactics observed in material-risk alerts.' }
);

const NO_MATERIAL_RISK_TEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.noMaterialRiskText',
  { defaultMessage: 'No material-risk entities in the current snapshot.' }
);

const NO_TOP_RISKS_TEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.noTopRisksText',
  { defaultMessage: 'No scored entities to rank.' }
);

const POPUP_BLOCKED_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.popupBlockedTitle',
  { defaultMessage: 'Allow pop-ups to export the brief' }
);

const POPUP_BLOCKED_TEXT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.popupBlockedText',
  {
    defaultMessage:
      'The printable brief opens in a new tab. Allow pop-ups for this site and export again.',
  }
);

/** Minimal HTML entity escaping so entity names/narrative cannot break the layout. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDeltaText = (kpi: ExecutiveKpi): string => {
  if (!kpi.delta) return '';
  if (kpi.delta.direction === 'flat') {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.deltaFlatText',
      { defaultMessage: 'Flat vs {comparedTo}', values: { comparedTo: kpi.delta.comparedTo } }
    );
  }
  return i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.deltaText',
    {
      defaultMessage: '{sign}{magnitude} vs {comparedTo}',
      values: {
        sign: kpi.delta.direction === 'up' ? '+' : '−',
        magnitude: Math.abs(kpi.delta.value),
        comparedTo: kpi.delta.comparedTo,
      },
    }
  );
};

const formatCount = (value: number | undefined): string =>
  value === undefined ? '—' : value.toLocaleString();

const renderMetric = (value: number | undefined, label: string): string =>
  `<div class="agent-metric"><strong>${escapeHtml(formatCount(value))}</strong><span>${escapeHtml(
    label
  )}</span></div>`;

const renderAgentEvidence = (agents: ExecutiveBriefAgentSnapshot): string => {
  const changedSessions =
    (agents.totals.evaluatedSessions ?? 0) > 0 ? agents.totals.changedSessions : undefined;
  const comparisonStatus =
    agents.totals.evaluatedSessions === undefined
      ? comparisonLabel('incomplete_coverage')
      : agents.totals.evaluatedSessions === 0
      ? comparisonLabel('insufficient_baseline')
      : undefined;
  const sessionsLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.sessions',
    { defaultMessage: 'Sessions & MCP connections observed' }
  );
  const observationsLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.observations',
    { defaultMessage: 'Accumulated tool observations' }
  );
  const invocationsLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.invocations',
    { defaultMessage: 'Agent invocations' }
  );
  const changedLabel = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.changedSessions',
    { defaultMessage: 'Sessions with behavior changes' }
  );
  const providers = agents.providers
    .map((provider) => {
      const identityLabel =
        provider.provider === 'agent_builder'
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.configuredAgents',
              { defaultMessage: 'Configured agents' }
            )
          : i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.installations',
              { defaultMessage: 'Observed installations' }
            );
      const metrics =
        provider.provider === 'agent_builder'
          ? renderMetric(provider.invocations, invocationsLabel) +
            renderMetric(
              provider.failedInvocations,
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.failedInvocations',
                { defaultMessage: 'Failed invocations' }
              )
            )
          : renderMetric(provider.sessions, externalAgentGrouping(provider.provider, true)) +
            renderMetric(provider.toolObservations, observationsLabel) +
            renderMetric(
              provider.failedToolObservations,
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.failedObservations',
                { defaultMessage: 'Failed tool observations' }
              )
            ) +
            renderMetric(
              provider.unknownToolOutcomes,
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.unknownOutcomes',
                { defaultMessage: 'Unknown tool outcomes' }
              )
            );
      return `<article class="provider ${
        provider.provider
      }"><div class="provider-heading"><h3>${escapeHtml(
        provider.name
      )}</h3><span class="status">${escapeHtml(
        briefProviderStatusLabel(provider.status)
      )}</span></div>${renderMetric(provider.identityCount, identityLabel)}${metrics}</article>`;
    })
    .join('');
  const findings = agents.changedSessions.length
    ? `<div class="behavior-findings">${agents.changedSessions
        .map((session) => {
          const name =
            agents.providers.find((provider) => provider.provider === session.provider)?.name ??
            session.provider;
          return `<article class="behavior-finding"><div class="eyebrow">${escapeHtml(
            name
          )}</div><h3>${escapeHtml(session.title)}</h3><ul>${session.findings
            .map((finding) => `<li>${escapeHtml(briefFindingDescription(finding))}</li>`)
            .join('')}</ul><div class="source-reference">${escapeHtml(
            i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.sessionReference',
              { defaultMessage: 'Session: {id}', values: { id: session.sessionId } }
            )
          )}</div></article>`;
        })
        .join('')}</div>`
    : `<p class="muted">${escapeHtml(
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.noBehaviorFindings',
          {
            defaultMessage:
              'No behavior findings in this snapshot. Coverage and baseline availability determine which sessions can be assessed.',
          }
        )
      )}</p>`;
  const baseline = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.behaviorCoverage',
    {
      defaultMessage: 'Sessions with changes: {changed} · Comparable sessions: {evaluated}',
      values: {
        changed: formatCount(changedSessions),
        evaluated: formatCount(agents.totals.evaluatedSessions),
      },
    }
  );
  const builderAgents = agents.builderAgents.length
    ? `<div class="builder-evidence"><h3>${escapeHtml(
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.builderDefinitions',
          { defaultMessage: 'Agent Builder definitions in scope' }
        )
      )}</h3><ul>${agents.builderAgents
        .map(
          (agent) =>
            `<li><strong>${escapeHtml(agent.name)}</strong> — ${escapeHtml(
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.builderDefinitionDetail',
                {
                  defaultMessage:
                    '{tools, plural, one {# configured tool} other {# configured tools}} · {connectors, plural, one {# configured connector} other {# configured connectors}} · Observed invocations: {invocations}',
                  values: {
                    tools: agent.configuredTools,
                    connectors: agent.configuredConnectors,
                    invocations: formatCount(agent.invocations),
                  },
                }
              )
            )}</li>`
        )
        .join('')}</ul></div>`
    : '';
  return `<section class="agent-evidence"><h2>${escapeHtml(
    i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.agentHeading', {
      defaultMessage: 'AI agent activity and behavior',
    })
  )}</h2><p class="section-intro">${escapeHtml(
    i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.agentWindow', {
      defaultMessage:
        'Activity observed in the last {days, number} days. Session observations, Claude Desktop MCP connections and Agent Builder invocations are different units.',
      values: { days: agents.lookbackDays },
    })
  )}</p><div class="agent-totals">${renderMetric(
    agents.totals.externalSessions,
    sessionsLabel
  )}${renderMetric(agents.totals.toolObservations, observationsLabel)}${renderMetric(
    changedSessions,
    changedLabel
  )}</div><div class="provider-grid">${providers}</div><h3 class="section-heading">${escapeHtml(
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.behaviorHeading',
      { defaultMessage: 'Behavior requiring review' }
    )
  )}</h3><p class="muted">${escapeHtml(
    [comparisonStatus, baseline].filter(Boolean).join(' · ')
  )}</p>${findings}${builderAgents}</section>`;
};

const hasObservedEvidence = (status: BriefSourceStatus | undefined): boolean =>
  status === undefined || status === 'available' || status === 'partial';

const partialEvidenceNote = (status: BriefSourceStatus | undefined): string =>
  status === 'partial'
    ? `<p class="muted">${escapeHtml(
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.partialEvidence',
          { defaultMessage: 'Partial evidence. Displayed figures describe the loaded sample.' }
        )
      )}</p>`
    : '';

const renderCoverage = (
  coverage: ExecutiveBriefCoverage | undefined,
  agents: ExecutiveBriefAgentSnapshot | undefined
): string => {
  if (!coverage && !agents) return '';
  const statuses = coverage
    ? (Object.keys(coverage) as Array<keyof ExecutiveBriefCoverage>)
        .map(
          (source) =>
            `<div class="coverage-item"><strong>${escapeHtml(
              briefCoverageSourceLabel(source)
            )}</strong><span>${escapeHtml(briefCoverageStatusLabel(coverage[source]))}</span></div>`
        )
        .join('')
    : '';
  const limits =
    agents?.limitations
      .map((limitation) => `<li>${escapeHtml(briefLimitationLabel(limitation))}</li>`)
      .join('') ?? '';
  return `<section class="coverage"><h2>${escapeHtml(
    i18n.translate(
      'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.coverageHeading',
      { defaultMessage: 'Evidence coverage and limits' }
    )
  )}</h2><div class="coverage-grid">${statuses}</div>${
    limits ? `<ul>${limits}</ul>` : ''
  }</section>`;
};

export interface ExecutiveBriefPdfPayload {
  brief?: ExecutiveBrief;
  agents?: ExecutiveBriefAgentSnapshot;
  coverage?: ExecutiveBriefCoverage;
  capturedAtLabel?: string;
  kpis: readonly ExecutiveKpi[];
  riskBands: readonly RiskBandDatum[];
  riskTypes: readonly RiskTypeDatum[];
  killChain: KillChainCoverage;
  topRisks: readonly BriefTopRisk[];
  /** Human-readable generation timestamp for provenance. */
  generatedAtLabel: string;
  /** Connector/model name behind the generation, when known. */
  connectorName: string | undefined;
}

/** Renders one supplied evidence snapshot and its optional narrative as a self-contained print document. */
export const buildExecutiveBriefPrintDocument = ({
  brief,
  kpis,
  riskBands,
  riskTypes,
  killChain,
  topRisks,
  generatedAtLabel,
  connectorName,
  agents,
  coverage,
  capturedAtLabel,
}: ExecutiveBriefPdfPayload): string => {
  const unavailableEvidence = i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.unavailableEvidence',
    { defaultMessage: 'Evidence unavailable in this snapshot.' }
  );
  const emptyEvidence = (status: BriefSourceStatus | undefined, empty: string): string =>
    status === 'partial'
      ? i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.incompleteEvidence',
          {
            defaultMessage:
              'Evidence is incomplete in this snapshot; an absence of observed risk is not established.',
          }
        )
      : status && status !== 'available'
      ? unavailableEvidence
      : empty;
  const kpiCards = kpis
    .map((kpi) => {
      const complete =
        !coverage ||
        (kpi.id === 'activeSignals'
          ? coverage.anomalies === 'available' && coverage.huntingLeads === 'available'
          : kpi.id === 'tacticsObserved'
          ? coverage.detections === 'available'
          : coverage.entityStore === 'available');
      const value = !complete || kpi.value === undefined ? '—' : kpi.value.toLocaleString();
      const delta = complete ? formatDeltaText(kpi) : '';
      const deltaHtml = delta ? `<div class="kpi-delta">${escapeHtml(delta)}</div>` : '';
      return `<div class="kpi"><div class="kpi-value">${escapeHtml(
        value
      )}</div><div class="kpi-label">${escapeHtml(KPI_LABELS[kpi.id])}</div>${deltaHtml}</div>`;
    })
    .join('');

  const riskMixHtml =
    hasObservedEvidence(coverage?.entityStore) && riskBands.length > 0
      ? riskBands
          .map((band) => {
            const width = Math.min(100, Math.max(0, band.percentage));
            const color = band.level === 'Critical' ? '#BD271E' : '#DA8B45';
            return `<div class="bar-row"><span class="bar-label">${escapeHtml(
              BAND_LABELS[band.level]
            )}</span><span class="bar-track"><span class="bar-fill" style="width:${width}%;background:${color}"></span></span><span class="bar-count">${escapeHtml(
              band.count.toLocaleString()
            )}</span></div>`;
          })
          .join('')
      : `<div class="empty">${escapeHtml(
          emptyEvidence(coverage?.entityStore, NO_MATERIAL_RISK_TEXT)
        )}</div>`;

  const topRisksHtml =
    hasObservedEvidence(coverage?.entities) && topRisks.length > 0
      ? `<table class="risk-table"><thead><tr><th>${escapeHtml(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.colEntity',
            { defaultMessage: 'Entity' }
          )
        )}</th><th>${escapeHtml(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.colType',
            { defaultMessage: 'Type' }
          )
        )}</th><th>${escapeHtml(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.colCriticality',
            { defaultMessage: 'Criticality' }
          )
        )}</th><th class="num">${escapeHtml(
          i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.colScore',
            { defaultMessage: 'Risk' }
          )
        )}</th></tr></thead><tbody>${topRisks
          .map(
            (risk) =>
              `<tr><td class="risk-name">${escapeHtml(risk.name)}</td><td>${escapeHtml(
                ENTITY_TYPE_LABELS[risk.type]
              )}</td><td>${escapeHtml(
                formatCriticality(risk.criticality)
              )}</td><td class="num">${escapeHtml(`${risk.score}`)}</td></tr>`
          )
          .join('')}</tbody></table>`
      : `<div class="empty">${escapeHtml(
          emptyEvidence(coverage?.entities, NO_TOP_RISKS_TEXT)
        )}</div>`;

  const riskTypeHtml =
    hasObservedEvidence(coverage?.entityStore) && riskTypes.length > 0
      ? riskTypes
          .map((entry) => {
            const width = Math.min(100, Math.max(0, entry.percentage));
            const color =
              entry.type === 'host' ? '#BD271E' : entry.type === 'user' ? '#DA8B45' : '#D6BF57';
            return `<div class="bar-row"><span class="bar-label">${escapeHtml(
              ENTITY_TYPE_LABELS[entry.type]
            )}</span><span class="bar-track"><span class="bar-fill" style="width:${width}%;background:${color}"></span></span><span class="bar-count">${escapeHtml(
              entry.count.toLocaleString()
            )}</span></div>`;
          })
          .join('')
      : `<div class="empty">${escapeHtml(
          emptyEvidence(coverage?.entityStore, NO_MATERIAL_RISK_TEXT)
        )}</div>`;

  const killChainHtml =
    hasObservedEvidence(coverage?.detections) && killChain.steps.length > 0
      ? `<div class="killchain">${killChain.steps
          .map((step) => {
            const technique = step.topTechnique
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.killChainStepTechnique',
                  {
                    defaultMessage: '{technique} · {count}',
                    values: {
                      technique: step.topTechnique.name,
                      count: step.topTechnique.alertCount,
                    },
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.killChainStepAlerts',
                  {
                    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
                    values: { count: step.alertCount },
                  }
                );
            return `<div class="kc-step"><div class="kc-tactic">${escapeHtml(
              step.tacticName
            )}</div><div class="kc-technique">${escapeHtml(technique)}</div></div>`;
          })
          .join('')}</div>`
      : `<div class="empty">${escapeHtml(
          emptyEvidence(coverage?.detections, NO_KILL_CHAIN_TEXT)
        )}</div>`;

  const impactHtml = brief?.businessImpact
    ? `<section><h2>${escapeHtml(IMPACT_HEADING)}</h2><p>${escapeHtml(
        brief.businessImpact
      )}</p></section>`
    : '';

  const decisionsHtml =
    brief && brief.decisions.length > 0
      ? `<section class="decisions"><h2>${escapeHtml(DECISIONS_HEADING)}</h2><ol>${brief.decisions
          .map((decision) => `<li>${escapeHtml(decision)}</li>`)
          .join('')}</ol></section>`
      : '';

  const provenanceParts = [capturedAtLabel, generatedAtLabel].filter((value): value is string =>
    Boolean(value)
  );
  if (brief && connectorName) {
    provenanceParts.push(
      i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.overview.brief.pdf.generatedBy',
        { defaultMessage: 'Generated by {connector}', values: { connector: connectorName } }
      )
    );
  }
  const provenance = [...new Set(provenanceParts)].map(escapeHtml).join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(DOCUMENT_TITLE)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 36px 42px; max-width: 1120px; margin-inline: auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #182638; background: #fff; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 3px solid #193852; padding-bottom: 20px; margin-bottom: 22px; }
  h1 { font-size: 30px; letter-spacing: -0.04em; line-height: 1.1; margin: 6px 0 10px; }
  .eyebrow { color: #3c647b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; }
  .scope { margin: 0; font-size: 12px; color: #4c6075; }
  .report-kind { border: 1px solid #b8c7d4; border-radius: 20px; padding: 6px 10px; font-size: 11px; white-space: nowrap; }
  .provenance { margin-top: 12px; font-size: 10px; color: #546579; line-height: 1.6; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #344c64; margin: 24px 0 10px; }
  h3 { font-size: 13px; line-height: 1.4; margin: 0; overflow-wrap: anywhere; }
  .section-heading { margin-top: 18px; }
  section { break-inside: auto; }
  .narrative { font-size: 16px; line-height: 1.6; padding: 20px 22px; border-left: 4px solid #27798e; background: #f0f7fa; overflow-wrap: anywhere; }
  .kpi-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .kpi { border: 1px solid #d3dde5; border-radius: 8px; padding: 13px 14px; }
  .kpi-value { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .kpi-label { font-size: 11px; color: #43546a; margin-top: 4px; }
  .kpi-delta { font-size: 10px; color: #546579; margin-top: 4px; }
  .decisions { padding: 0 18px 16px; border: 1px solid #c8d9ce; border-radius: 8px; margin-top: 20px; background: #f7faf7; break-inside: avoid; }
  .decisions h2 { color: #245d47; margin-top: 15px; }
  .decisions li { padding: 3px 0 3px 4px; font-weight: 600; }
  .agent-evidence { margin-top: 24px; padding-top: 1px; border-top: 1px solid #d3dde5; }
  .section-intro, .muted { color: #546579; font-size: 11px; }
  .agent-totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 12px 0; }
  .agent-totals .agent-metric { display: block; }
  .agent-totals .agent-metric strong { display: block; font-size: 22px; margin-bottom: 3px; }
  .provider-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 6px; }
  .provider { border: 1px solid #d3dde5; border-top: 3px solid #27798e; border-radius: 6px; padding: 12px; break-inside: avoid; }
  .provider.cursor { border-top-color: #6b56a3; }
  .provider.agent_builder { border-top-color: #2e7a53; }
  .provider-heading { margin-bottom: 12px; }
  .provider-heading h3 { font-size: 16px; }
  .status { display: inline-block; font-size: 10px; color: #546579; margin-top: 4px; }
  .agent-metric { display: flex; flex-direction: row-reverse; justify-content: space-between; align-items: baseline; gap: 12px; margin-top: 7px; font-size: 11px; color: #43546a; }
  .agent-metric strong { color: #182638; font-variant-numeric: tabular-nums; }
  .behavior-findings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
  .behavior-finding { padding: 12px 14px; border: 1px solid #ddcc9f; border-radius: 6px; background: #fffbf2; break-inside: avoid; }
  .behavior-finding .eyebrow { color: #7d6022; margin-bottom: 4px; }
  .behavior-finding li { font-size: 11px; }
  .source-reference { margin-top: 10px; font-size: 9px; color: #546579; overflow-wrap: anywhere; }
  .builder-evidence { margin-top: 18px; break-inside: avoid; }
  .builder-evidence li { font-size: 11px; }
  .two-col { display: grid; grid-template-columns: 1fr 1.6fr; gap: 28px; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-top: 7px; font-size: 11px; }
  .bar-label { width: 58px; }
  .bar-track { flex: 1; height: 7px; background: #eef0f4; border-radius: 4px; overflow: hidden; }
  .bar-fill { display: block; height: 100%; }
  .bar-count { font-weight: 600; font-variant-numeric: tabular-nums; }
  .risk-name { font-weight: 600; overflow-wrap: anywhere; }
  .risk-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
  .risk-table th { text-align: left; padding: 6px; border-bottom: 1px solid #d3dde5; color: #546579; font-weight: 600; }
  .risk-table td { padding: 7px 6px; border-bottom: 1px solid #eef0f4; }
  .risk-table .num { text-align: right; font-variant-numeric: tabular-nums; }
  .risk-table tr { break-inside: avoid; }
  .killchain { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .kc-step { flex: 1 1 120px; padding: 9px 10px; border: 1px solid #ddc4c1; border-radius: 4px; background: #fff8f7; break-inside: avoid; }
  .kc-tactic { font-size: 11px; font-weight: 600; }
  .kc-technique { font-size: 10px; color: #546579; margin-top: 4px; }
  .empty { font-size: 11px; color: #546579; margin-top: 6px; }
  .coverage { margin-top: 24px; padding-top: 1px; border-top: 1px solid #d3dde5; }
  .coverage-grid { display: flex; flex-wrap: wrap; gap: 10px 20px; }
  .coverage-item { font-size: 10px; display: flex; flex-direction: column; gap: 4px; }
  .coverage-item span { color: #546579; }
  .coverage li { color: #546579; font-size: 10px; }
  ul, ol { margin: 7px 0 0; padding-left: 18px; }
  li { font-size: 12px; line-height: 1.5; margin-top: 5px; overflow-wrap: anywhere; }
  p { font-size: 12px; line-height: 1.6; margin: 6px 0 0; overflow-wrap: anywhere; }
  footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #d3dde5; font-size: 10px; color: #546579; }
  @media print {
    body { padding: 0; max-width: none; }
    @page { margin: 14mm; }
    h2, h3 { break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
  }
  @media screen and (max-width: 700px) {
    body { padding: 24px; }
    .provider-grid, .two-col, .behavior-findings { grid-template-columns: 1fr; }
    .kpi-strip, .agent-totals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
</style>
</head>
<body>
  <header>
    <div>
      <div class="eyebrow">${escapeHtml(
        i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.brand', {
          defaultMessage: 'Entity Intelligence',
        })
      )}</div>
      <h1>${escapeHtml(DOCUMENT_TITLE)}</h1>
      <p class="scope">${escapeHtml(
        i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.scope', {
          defaultMessage: 'Users, hosts, services and AI agents',
        })
      )}</p>
      <div class="provenance">${provenance}</div>
    </div>
    <span class="report-kind">${escapeHtml(
      brief
        ? i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.generatedAssessment',
            { defaultMessage: 'AI assessment + evidence' }
          )
        : i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.evidenceSnapshot',
            { defaultMessage: 'Evidence snapshot' }
          )
    )}</span>
  </header>

  ${
    brief
      ? `<section><h2>${escapeHtml(NARRATIVE_HEADING)}</h2><div class="narrative">${escapeHtml(
          brief.narrative
        )}</div></section>`
      : ''
  }
  ${impactHtml}
  ${decisionsHtml}

  <section>
    <h2>${escapeHtml(KPI_HEADING)}</h2>
    <div class="kpi-strip">${kpiCards}</div>
  </section>

  ${agents ? renderAgentEvidence(agents) : ''}

  <div class="two-col">
    <div><h2>${escapeHtml(RISK_MIX_HEADING)}</h2>${partialEvidenceNote(
    coverage?.entityStore
  )}${riskMixHtml}
      <h2>${escapeHtml(RISK_BY_TYPE_HEADING)}</h2>${riskTypeHtml}</div>
    <div><h2>${escapeHtml(TOP_RISKS_HEADING)}</h2>${partialEvidenceNote(
    coverage?.entities
  )}${topRisksHtml}</div>
  </div>

  <section>
    <h2>${escapeHtml(KILL_CHAIN_HEADING)}</h2>
    ${partialEvidenceNote(coverage?.detections)}${killChainHtml}
  </section>
  ${renderCoverage(coverage, agents)}
  <footer>${escapeHtml(
    i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.brief.pdf.snapshotFooter', {
      defaultMessage:
        'This report reflects the evidence captured for this brief. Later dashboard updates are not included.',
    })
  )}</footer>
</body>
</html>`;
};

export interface ExecutiveBriefExportButtonProps {
  payload: ExecutiveBriefPdfPayload;
  onPopupBlocked: (title: string, text: string) => void;
}

/** Opens the captured brief in a print window for the browser’s Save as PDF workflow. */
export const ExecutiveBriefExportButton: React.FC<ExecutiveBriefExportButtonProps> = ({
  payload,
  onPopupBlocked,
}) => {
  const handleExport = useCallback(() => {
    // NOTE: do NOT pass `noopener`/`noreferrer` here. Those features sever the
    // returned window handle (window.open returns null), so the document write
    // never lands and the print window renders blank. We need the live handle
    // to write the report and drive the print dialog.
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      onPopupBlocked(POPUP_BLOCKED_TITLE, POPUP_BLOCKED_TEXT);
      return;
    }

    const html = buildExecutiveBriefPrintDocument(payload);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Print only after the new document has actually painted. Writing the
    // markup is synchronous, but layout/style application is not; printing too
    // early shows a blank preview. Prefer the document's own load event and
    // fall back to a rAF + timeout so the dialog always opens with content.
    let printed = false;
    const triggerPrint = () => {
      if (printed || printWindow.closed) return;
      printed = true;
      printWindow.focus();
      printWindow.print();
    };
    printWindow.onload = triggerPrint;
    printWindow.requestAnimationFrame(() =>
      printWindow.requestAnimationFrame(() => printWindow.setTimeout(triggerPrint, 300))
    );
  }, [onPopupBlocked, payload]);

  return (
    <EuiButtonEmpty
      size="s"
      iconType="export"
      onClick={handleExport}
      data-test-subj="entityIntelligenceExportExecutiveBrief"
    >
      {EXPORT_BUTTON_LABEL}
    </EuiButtonEmpty>
  );
};
