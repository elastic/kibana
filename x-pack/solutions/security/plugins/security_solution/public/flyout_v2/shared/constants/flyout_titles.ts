/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// ── Document flyouts ──────────────────────────────────────────────────────────
// Main entry-point flyouts opened as new top-level sessions.

export const DEFAULT_DOCUMENT_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.document.header.title',
  { defaultMessage: 'Document details' }
);

export const NETWORK_FLYOUT_TITLE = i18n.translate('xpack.securitySolution.flyout.network.title', {
  defaultMessage: 'Network',
});

export const IOC_FLYOUT_TITLE = i18n.translate('xpack.securitySolution.flyout.indicator.title', {
  defaultMessage: 'Indicator',
});

// ── Tools flyouts ─────────────────────────────────────────────────────────────
// Secondary panels opened with session: 'start' from within a document flyout.

export const ANALYZER_TITLE = i18n.translate('xpack.securitySolution.flyout.analyzer.title', {
  defaultMessage: 'Analyzer',
});

export const CORRELATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.correlations.title',
  { defaultMessage: 'Correlations' }
);

export const INVESTIGATION_GUIDE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.investigationGuide.title',
  { defaultMessage: 'Investigation guide' }
);

export const NOTES_TITLE = i18n.translate('xpack.securitySolution.flyout.notes.title', {
  defaultMessage: 'Notes',
});

export const PREVALENCE_TITLE = i18n.translate('xpack.securitySolution.flyout.prevalence.title', {
  defaultMessage: 'Prevalence',
});

export const SESSION_VIEW_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.sessionView.title',
  { defaultMessage: 'Session view' }
);

export const THREAT_INTELLIGENCE_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.title',
  { defaultMessage: 'Threat intelligence' }
);

// ── Child flyouts ─────────────────────────────────────────────────────────────
// Panels opened with session: 'inherit', appended to the current session.

export const ANALYZER_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.analyzerPanel.title',
  { defaultMessage: 'Process details' }
);

export const RULE_FLYOUT_TITLE = i18n.translate('xpack.securitySolution.flyout.rule.title', {
  defaultMessage: 'Rule',
});

export const SESSION_VIEW_DETAILS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.sessionViewDetails.title',
  { defaultMessage: 'Process details' }
);

// ── Document overview section titles ─────────────────────────────────────────
// Internal section labels within the document flyout overview tab.

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
