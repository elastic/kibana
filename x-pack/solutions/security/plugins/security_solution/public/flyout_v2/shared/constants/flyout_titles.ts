/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Single source of truth for every static label used to build a v2 flyout's
 * `overlays.openSystemFlyout` `title` option (rendered by EUI's flyout-manager history/back-nav
 * UI), as well as the panel's own on-screen tool header where the same label applies.
 *
 * Combine a label here with a dynamic value (document title, entity name, rule name, ...) using
 * {@link formatFlyoutTitle} so every flyout produces a consistent "{Type}: {value}" history entry.
 */

/**
 * Returns `"{canonicalName}: {value}"` when a value is available, or just `canonicalName`
 * otherwise. Used to build the `title` passed to `overlays.openSystemFlyout` so flyout history
 * entries read consistently (e.g. `Analyzer: My Rule`, `Host: my-host`).
 */
export const formatFlyoutTitle = (canonicalName: string, value?: string | null): string =>
  value ? `${canonicalName}: ${value}` : canonicalName;

// ── Entry flyouts (documents & entities) ────────────────────────────────────────
// Titles for documents, rules, hosts/users/services/entities, network, indicators, and attacks —
// opened either as a new top-level session (`session: 'start'`) or chained as a child onto an
// existing one (`session: 'inherit'`), depending on the caller.

/**
 * History fallback for an alert (signal) document with no resolved rule name. Deliberately
 * distinct from `DEFAULT_DOCUMENT_TITLE` in `document/main/utils/get_header_title.ts` (which
 * remains "Document details" and is also used by the legacy expandable flyout) so this rename
 * only affects v2 flyout history, not the older flyout system.
 */
export const ALERT_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.alert', {
  defaultMessage: 'Alert',
});

/**
 * History fallback for a plain (non-alert) event document, e.g. a graph node clicked before its
 * full document has loaded. Kept distinct from {@link ALERT_TITLE} so callers can tell alert and
 * event nodes apart without needing the full document.
 */
export const EVENT_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.event', {
  defaultMessage: 'Event',
});

export const RULE_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.rule', {
  defaultMessage: 'Rule',
});

export const HOST_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.host', {
  defaultMessage: 'Host',
});

export const USER_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.user', {
  defaultMessage: 'User',
});

export const SERVICE_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.service', {
  defaultMessage: 'Service',
});

export const GENERIC_ENTITY_TITLE = i18n.translate(
  'xpack.securitySolution.flyoutV2.titles.genericEntity',
  { defaultMessage: 'Entity' }
);

export const NETWORK_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.network', {
  defaultMessage: 'Network',
});

export const IOC_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.indicator', {
  defaultMessage: 'Indicator',
});

export const ATTACK_TITLE = i18n.translate('xpack.securitySolution.flyoutV2.titles.attack', {
  defaultMessage: 'Attack',
});

// ── Document tools ───────────────────────────────────────────────────────────────
// Secondary panels opened from within the document flyout. Most start their own new session
// (`session: 'start'`); a few — {@link ANALYZER_PREVIEW_TITLE}, {@link SESSION_VIEW_DETAILS_TITLE},
// and {@link ENTITIES_TITLE} when reused for a grouped-entities preview — are opened as a child
// (`session: 'inherit'`) of whichever tool triggered them. {@link NOTES_TITLE} is also opened
// standalone, outside any flyout (e.g. the note button on an alerts-table row).

export const ANALYZER_TITLE = i18n.translate('xpack.securitySolution.flyout.analyzer.title', {
  defaultMessage: 'Analyzer',
});

/**
 * Title for the Resolver's node-click "Analyzer preview" panel (the process/node details view
 * opened from within the Analyzer graph), as distinct from {@link ANALYZER_TITLE} (the Analyzer
 * tool tab itself).
 */
export const ANALYZER_PREVIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyoutV2.titles.analyzerPreview',
  { defaultMessage: 'Analyzer preview' }
);

export const SESSION_VIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.sessionView.title',
  { defaultMessage: 'Session view' }
);

export const SESSION_VIEW_DETAILS_TITLE = i18n.translate(
  'xpack.securitySolution.flyoutV2.titles.sessionViewDetails',
  { defaultMessage: 'Process details' }
);

export const GRAPH_TITLE = i18n.translate('xpack.securitySolution.flyout.graph.title', {
  defaultMessage: 'Graph',
});

export const CORRELATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.correlations.title',
  { defaultMessage: 'Correlations' }
);

export const PREVALENCE_TITLE = i18n.translate('xpack.securitySolution.flyout.prevalence.title', {
  defaultMessage: 'Prevalence',
});

export const THREAT_INTELLIGENCE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.title',
  { defaultMessage: 'Threat intelligence' }
);

export const ENTITIES_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.entities.title',
  { defaultMessage: 'Entities' }
);

export const INVESTIGATION_GUIDE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.investigationGuide.title',
  { defaultMessage: 'Investigation guide' }
);

export const RESPONSE_TITLE = i18n.translate('xpack.securitySolution.flyout.response.title', {
  defaultMessage: 'Response',
});

export const NOTES_TITLE = i18n.translate('xpack.securitySolution.flyout.notes.title', {
  defaultMessage: 'Notes',
});

// ── Attack tools ─────────────────────────────────────────────────────────────────
// Secondary panels opened from within the attack flyout. Kept distinct from the document-tool
// titles above even where the label text matches, since they are separate components with their
// own pre-existing i18n keys.

export const ATTACK_ENTITIES_TITLE = i18n.translate(
  'xpack.securitySolution.flyoutV2.attack.tools.entities.title',
  { defaultMessage: 'Entities' }
);

export const ATTACK_CORRELATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyoutV2.attack.tools.correlations.title',
  { defaultMessage: 'Correlations' }
);

// ── Entity tools ─────────────────────────────────────────────────────────────────
// Secondary panels opened from within a host/user/service/generic-entity flyout.

export const RISK_INPUTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.riskInputs.title',
  { defaultMessage: 'Risk score' }
);

export const ALERTS_INSIGHTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.alertsInsights.title',
  { defaultMessage: 'Alerts' }
);

export const ANOMALY_INSIGHTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.anomalyInsights.title',
  { defaultMessage: 'Behavioral anomalies' }
);

export const MISCONFIGURATION_INSIGHTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.misconfigurationInsights.title',
  { defaultMessage: 'Misconfigurations' }
);

export const VULNERABILITY_INSIGHTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.vulnerabilityInsights.title',
  { defaultMessage: 'Vulnerabilities' }
);

export const VULNERABILITY_FINDING_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.csp.vulnerability.title',
  { defaultMessage: 'Vulnerability' }
);

export const MISCONFIGURATION_FINDING_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.csp.misconfiguration.title',
  { defaultMessage: 'Misconfiguration' }
);

export const FIELDS_TABLE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.fieldsTable.title',
  { defaultMessage: 'Fields' }
);

export const RESOLUTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.resolution.title',
  { defaultMessage: 'Entity resolution' }
);

export const ENTITY_GRAPH_VIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.graphView.title',
  { defaultMessage: 'Graph' }
);

export const ENTRA_INSIGHTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.user.entraInsights.title',
  { defaultMessage: 'Entra Data' }
);

export const OKTA_INSIGHTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.user.oktaInsights.title',
  { defaultMessage: 'Okta Data' }
);

// ── Document overview section titles ─────────────────────────────────────────────
// Internal section labels within the document flyout overview tab, not flyout history entries.
// Centralized here since most (e.g. {@link ABOUT_SECTION_TITLE}) are also reused by the legacy
// expandable flyout's equivalent section components.

export const ABOUT_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.about.sectionTitle',
  { defaultMessage: 'About' }
);

export const INSIGHTS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.insights.sectionTitle',
  { defaultMessage: 'Insights' }
);

export const INVESTIGATION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.investigation.sectionTitle',
  { defaultMessage: 'Investigation' }
);

export const VISUALIZATION_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.visualizations.sectionTitle',
  { defaultMessage: 'Visualizations' }
);
