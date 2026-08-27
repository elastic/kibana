/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DETONATE = i18n.translate('xpack.securitySolution.detonate.pageTitle', {
  defaultMessage: 'Detonate',
});

export const DETONATE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detonate.pageDescription',
  {
    defaultMessage:
      'Malware detonation results from the Elastic Security Labs sandbox, with pivots into alerts and the process analyzer.',
  }
);

export const DETONATE_SUBTITLE = i18n.translate('xpack.securitySolution.detonate.pageSubtitle', {
  defaultMessage:
    'Real malware, detonated on real Elastic Defend endpoints. Every result below links to the alerts it produced.',
});

/* KPIs */

export const KPI_DETONATIONS = i18n.translate('xpack.securitySolution.detonate.kpi.detonations', {
  defaultMessage: 'Detonations',
});

export const KPI_FAMILIES = i18n.translate('xpack.securitySolution.detonate.kpi.families', {
  defaultMessage: 'Malware families',
});

export const KPI_FAMILIES_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detonate.kpi.familiesTooltip',
  {
    defaultMessage:
      'Distinct families named by Elastic signatures. Behavioural protections identify malicious activity without naming a family, so they are not counted here.',
  }
);

export const KPI_ENDPOINT_ALERTS = i18n.translate(
  'xpack.securitySolution.detonate.kpi.endpointAlerts',
  { defaultMessage: 'Endpoint alerts' }
);

export const KPI_DETECTION_ALERTS = i18n.translate(
  'xpack.securitySolution.detonate.kpi.detectionAlerts',
  { defaultMessage: 'Detection alerts' }
);

/* Table */

export const TABLE_TITLE = i18n.translate('xpack.securitySolution.detonate.table.title', {
  defaultMessage: 'Recent detonations',
});

export const COLUMN_TIMESTAMP = i18n.translate('xpack.securitySolution.detonate.table.timestamp', {
  defaultMessage: 'Detonated',
});

export const COLUMN_HASH = i18n.translate('xpack.securitySolution.detonate.table.hash', {
  defaultMessage: 'Sample',
});

export const COLUMN_FAMILY = i18n.translate('xpack.securitySolution.detonate.table.family', {
  defaultMessage: 'Malware family',
});

export const COLUMN_PROTECTIONS = i18n.translate(
  'xpack.securitySolution.detonate.table.protections',
  { defaultMessage: 'Protections fired' }
);

export const COLUMN_PLATFORM = i18n.translate('xpack.securitySolution.detonate.table.platform', {
  defaultMessage: 'Platform',
});

export const COLUMN_ALERTS = i18n.translate('xpack.securitySolution.detonate.table.alerts', {
  defaultMessage: 'Alerts',
});

export const COLUMN_SEVERITY = i18n.translate('xpack.securitySolution.detonate.table.severity', {
  defaultMessage: 'Rule severity',
});

export const COLUMN_SOURCE = i18n.translate('xpack.securitySolution.detonate.table.source', {
  defaultMessage: 'Source',
});

export const COLUMN_ACTIONS = i18n.translate('xpack.securitySolution.detonate.table.actions', {
  defaultMessage: 'Actions',
});

export const NO_FAMILY = i18n.translate('xpack.securitySolution.detonate.table.noFamily', {
  defaultMessage: 'Unnamed',
});

export const NO_FAMILY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detonate.table.noFamilyTooltip',
  {
    defaultMessage:
      'This detonation was caught by behavioural or memory protections that did not match a named signature.',
  }
);

export const NO_RULE_SEVERITY = i18n.translate(
  'xpack.securitySolution.detonate.table.noRuleSeverity',
  { defaultMessage: 'None' }
);

export const NO_RULE_SEVERITY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detonate.table.noRuleSeverityTooltip',
  {
    defaultMessage:
      'Severity comes from detection rules. This detonation produced only endpoint protection alerts, which do not carry one.',
  }
);

export const ENDPOINT_ALERTS_LABEL = i18n.translate(
  'xpack.securitySolution.detonate.table.endpointAlertsLabel',
  { defaultMessage: 'Endpoint' }
);

export const DETECTION_ALERTS_LABEL = i18n.translate(
  'xpack.securitySolution.detonate.table.detectionAlertsLabel',
  { defaultMessage: 'Detection' }
);

export const VIEW_ALERTS = i18n.translate('xpack.securitySolution.detonate.table.viewAlerts', {
  defaultMessage: 'View alerts',
});

export const VIEW_DETONATION = i18n.translate(
  'xpack.securitySolution.detonate.table.viewDetonation',
  { defaultMessage: 'View detonation' }
);

export const HASH_LINK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detonate.table.hashLinkTooltip',
  { defaultMessage: 'Open this detonation' }
);

export const HASH_ALERTS_ACTION = i18n.translate(
  'xpack.securitySolution.detonate.table.hashAlertsAction',
  { defaultMessage: 'Explore alerts in the Alerts page' }
);

export const NO_DETONATIONS = i18n.translate('xpack.securitySolution.detonate.table.empty', {
  defaultMessage: 'No detonations match the current filters',
});

export const NO_DETONATIONS_BODY = i18n.translate(
  'xpack.securitySolution.detonate.table.emptyBody',
  {
    defaultMessage:
      'Try widening the time range, or turn off the filters that hide undetected and unnamed samples.',
  }
);

export const LOAD_ERROR = i18n.translate('xpack.securitySolution.detonate.loadError', {
  defaultMessage: 'Unable to load detonation results',
});

export const LOAD_ERROR_BODY = i18n.translate('xpack.securitySolution.detonate.loadErrorBody', {
  defaultMessage:
    'The detonation index could not be queried. Confirm that Detonate data has been indexed into this cluster.',
});

/* Filters */

export const FILTER_ONLY_WITH_ALERTS = i18n.translate(
  'xpack.securitySolution.detonate.filters.onlyWithAlerts',
  { defaultMessage: 'Detected only' }
);

export const FILTER_ONLY_WITH_ALERTS_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detonate.filters.onlyWithAlertsTooltip',
  { defaultMessage: 'Hide detonations that produced no endpoint and no detection alerts.' }
);

export const FILTER_ONLY_NAMED = i18n.translate(
  'xpack.securitySolution.detonate.filters.onlyNamed',
  { defaultMessage: 'Named threats only' }
);

export const FILTER_ONLY_NAMED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detonate.filters.onlyNamedTooltip',
  {
    defaultMessage:
      'Keep only detonations whose signatures named a malware family, such as Windows.Trojan.Vidar.',
  }
);

export const FILTERED_ROW_COUNT = (total: number) =>
  i18n.translate('xpack.securitySolution.detonate.filters.rowCount', {
    defaultMessage: '{total, plural, one {# detonation} other {# detonations}}',
    values: { total },
  });

export const ROW_CAP_NOTICE = (limit: number) =>
  i18n.translate('xpack.securitySolution.detonate.filters.rowCapNotice', {
    defaultMessage:
      'Only the {limit} most recent matches are shown. Narrow the filters to reach older detonations.',
    values: { limit },
  });

export const FILTER_HASH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detonate.filters.hashPlaceholder',
  { defaultMessage: 'Paste a full or partial hash' }
);

export const FILTER_HASH_ARIA = i18n.translate('xpack.securitySolution.detonate.filters.hashAria', {
  defaultMessage: 'Sample hash',
});

export const FILTER_FAMILY = i18n.translate('xpack.securitySolution.detonate.filters.family', {
  defaultMessage: 'Malware family',
});

export const FILTER_PROTECTION = i18n.translate(
  'xpack.securitySolution.detonate.filters.protection',
  { defaultMessage: 'Protection fired' }
);

export const FILTER_PLATFORM = i18n.translate('xpack.securitySolution.detonate.filters.platform', {
  defaultMessage: 'Platform',
});

export const FILTER_SOURCE = i18n.translate('xpack.securitySolution.detonate.filters.source', {
  defaultMessage: 'Source',
});

export const FILTER_CLEAR_ALL = i18n.translate('xpack.securitySolution.detonate.filters.clearAll', {
  defaultMessage: 'Clear filters',
});

/* Breakdown charts */

export const CHART_FILTER_HINT = i18n.translate(
  'xpack.securitySolution.detonate.charts.filterHint',
  {
    defaultMessage: 'Select a bar to filter the table below, or use the filters above the charts.',
  }
);

export const PROTECTIONS_CHART_TITLE = i18n.translate(
  'xpack.securitySolution.detonate.protectionsChart.title',
  { defaultMessage: 'Protections fired' }
);

export const PROTECTIONS_CHART_SUBTITLE = i18n.translate(
  'xpack.securitySolution.detonate.protectionsChart.subtitle',
  {
    defaultMessage:
      'Detonations each protection layer caught. Several layers usually fire on one sample, so these do not add up to the total.',
  }
);

export const PROTECTIONS_CHART_EMPTY = i18n.translate(
  'xpack.securitySolution.detonate.protectionsChart.empty',
  { defaultMessage: 'No protections fired in this range' }
);

export const PROTECTIONS_AXIS_DETONATIONS = i18n.translate(
  'xpack.securitySolution.detonate.protectionsChart.axisDetonations',
  { defaultMessage: 'Detonations' }
);

export const PLATFORM_CHART_TITLE = i18n.translate(
  'xpack.securitySolution.detonate.platformChart.title',
  { defaultMessage: 'Platform coverage' }
);

export const PLATFORM_CHART_SUBTITLE = i18n.translate(
  'xpack.securitySolution.detonate.platformChart.subtitle',
  { defaultMessage: 'Detonations by the operating system they ran on' }
);

export const PLATFORM_CHART_EMPTY = i18n.translate(
  'xpack.securitySolution.detonate.platformChart.empty',
  { defaultMessage: 'No detonations in this range' }
);

export const PLATFORM_AXIS_DETONATIONS = i18n.translate(
  'xpack.securitySolution.detonate.platformChart.axisDetonations',
  { defaultMessage: 'Detonations' }
);

/* Families chart */

export const TOP_FAMILIES_TITLE = i18n.translate('xpack.securitySolution.detonate.families.title', {
  defaultMessage: 'Top malware families',
});

export const TOP_FAMILIES_SUBTITLE = i18n.translate(
  'xpack.securitySolution.detonate.families.subtitle',
  { defaultMessage: 'By number of signature detections' }
);

export const TOP_FAMILIES_EMPTY = i18n.translate('xpack.securitySolution.detonate.families.empty', {
  defaultMessage: 'No named malware families in this range',
});

export const FAMILIES_AXIS_DETECTIONS = i18n.translate(
  'xpack.securitySolution.detonate.families.axisDetections',
  { defaultMessage: 'Detections' }
);

/* Submit CTA */

export const SUBMIT_TITLE = i18n.translate('xpack.securitySolution.detonate.submit.title', {
  defaultMessage: 'Detonate your own sample',
});

export const SUBMIT_BODY = i18n.translate('xpack.securitySolution.detonate.submit.body', {
  defaultMessage:
    'Send a suspicious file to the sandbox and watch Elastic Defend respond to it in real time, end to end, with the alerts and process tree available here within minutes.',
});

export const SUBMIT_BUTTON = i18n.translate('xpack.securitySolution.detonate.submit.button', {
  defaultMessage: 'Submit a sample',
});

export const SUBMIT_COMING_SOON = i18n.translate(
  'xpack.securitySolution.detonate.submit.comingSoon',
  { defaultMessage: 'Coming soon' }
);

export const SUBMIT_UNAVAILABLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detonate.submit.unavailableTooltip',
  { defaultMessage: 'Sample submission is not available yet.' }
);

/* Research feed */

export const RESEARCH_TITLE = i18n.translate('xpack.securitySolution.detonate.research.title', {
  defaultMessage: 'From Elastic Security Labs',
});

export const RESEARCH_LINK = i18n.translate('xpack.securitySolution.detonate.research.link', {
  defaultMessage: 'Browse all research',
});

/* Detail page */

export const DETAIL_BREADCRUMB = i18n.translate('xpack.securitySolution.detonate.detail.back', {
  defaultMessage: 'Back to detonations',
});

export const DETAIL_NOT_FOUND = i18n.translate('xpack.securitySolution.detonate.detail.notFound', {
  defaultMessage: 'Detonation not found',
});

export const DETAIL_NOT_FOUND_BODY = i18n.translate(
  'xpack.securitySolution.detonate.detail.notFoundBody',
  { defaultMessage: 'This detonation no longer exists, or the identifier is not valid.' }
);

export const DETAIL_SAMPLE = i18n.translate('xpack.securitySolution.detonate.detail.sample', {
  defaultMessage: 'Sample',
});

export const DETAIL_PLATFORM = i18n.translate('xpack.securitySolution.detonate.detail.platform', {
  defaultMessage: 'Platform',
});

export const DETAIL_AGENT_VERSION = i18n.translate(
  'xpack.securitySolution.detonate.detail.agentVersion',
  { defaultMessage: 'Agent version' }
);

export const DETAIL_SOURCE = i18n.translate('xpack.securitySolution.detonate.detail.source', {
  defaultMessage: 'Source',
});

export const DETAIL_STATUS = i18n.translate('xpack.securitySolution.detonate.detail.status', {
  defaultMessage: 'Status',
});

export const DETAIL_DETONATED_AT = i18n.translate(
  'xpack.securitySolution.detonate.detail.detonatedAt',
  { defaultMessage: 'Detonated' }
);

export const DETAIL_OPEN_ANALYZER = i18n.translate(
  'xpack.securitySolution.detonate.detail.openAnalyzer',
  { defaultMessage: 'Open process analyzer' }
);

export const DETAIL_ANALYZER_TITLE = i18n.translate(
  'xpack.securitySolution.detonate.detail.analyzerTitle',
  { defaultMessage: 'Process analyzer' }
);

export const DETAIL_ALERTS_TITLE = i18n.translate(
  'xpack.securitySolution.detonate.detail.alertsTitle',
  { defaultMessage: 'Alerts from this detonation' }
);

export const DETAIL_DETECTION_RULES = i18n.translate(
  'xpack.securitySolution.detonate.detail.detectionRules',
  { defaultMessage: 'Detection rules triggered' }
);

export const DETAIL_SIGNATURES = i18n.translate(
  'xpack.securitySolution.detonate.detail.signatures',
  { defaultMessage: 'Signatures matched' }
);

export const DETAIL_OPEN_IN_ALERTS = i18n.translate(
  'xpack.securitySolution.detonate.detail.openInAlerts',
  { defaultMessage: 'Open in Alerts' }
);

export const DETAIL_ALERT_RULE = i18n.translate(
  'xpack.securitySolution.detonate.detail.alertRule',
  { defaultMessage: 'Rule' }
);

export const DETAIL_ALERT_PROCESS = i18n.translate(
  'xpack.securitySolution.detonate.detail.alertProcess',
  { defaultMessage: 'Process' }
);

export const DETAIL_ALERT_ACTIONS = i18n.translate(
  'xpack.securitySolution.detonate.detail.alertActions',
  { defaultMessage: 'Actions' }
);

export const DETAIL_ALERT_LINK_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detonate.detail.alertLinkTooltip',
  { defaultMessage: 'Open this alert on the Alerts page' }
);

export const DETAIL_ALERT_UNNAMED = i18n.translate(
  'xpack.securitySolution.detonate.detail.alertUnnamed',
  { defaultMessage: 'Untitled alert' }
);

export const DETAIL_NO_ALERTS = i18n.translate('xpack.securitySolution.detonate.detail.noAlerts', {
  defaultMessage: 'This detonation produced no alerts',
});

/* MITRE ATT&CK */

export const MITRE_TITLE = i18n.translate('xpack.securitySolution.detonate.mitre.title', {
  defaultMessage: 'MITRE ATT&CK',
});

export const MITRE_SUBTITLE = i18n.translate('xpack.securitySolution.detonate.mitre.subtitle', {
  defaultMessage: 'Tactics and techniques mapped by the rules that alerted on this detonation',
});

export const MITRE_REFERENCE_TOOLTIP = (name: string) =>
  i18n.translate('xpack.securitySolution.detonate.mitre.referenceTooltip', {
    defaultMessage: 'Read about {name} on attack.mitre.org',
    values: { name },
  });

export const MITRE_ALERTS_TOOLTIP = (name: string) =>
  i18n.translate('xpack.securitySolution.detonate.mitre.alertsTooltip', {
    defaultMessage: 'Show the alerts mapped to {name} on the Alerts page',
    values: { name },
  });

export const MITRE_ALERT_COUNT = (count: number) =>
  i18n.translate('xpack.securitySolution.detonate.mitre.alertCount', {
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
    values: { count },
  });

/* AI summary */

export const AI_SUMMARY_TITLE = i18n.translate('xpack.securitySolution.detonate.ai.title', {
  defaultMessage: 'AI summary',
});

export const AI_SUMMARY_GENERATE = i18n.translate('xpack.securitySolution.detonate.ai.generate', {
  defaultMessage: 'Generate summary',
});

export const AI_SUMMARY_REGENERATE = i18n.translate(
  'xpack.securitySolution.detonate.ai.regenerate',
  { defaultMessage: 'Regenerate' }
);

export const AI_SUMMARY_PROMPT = i18n.translate('xpack.securitySolution.detonate.ai.prompt', {
  defaultMessage:
    'Summarise what this sample did on the endpoint, and extract the indicators worth pivoting on.',
});

export const AI_SUMMARY_GENERATING = i18n.translate(
  'xpack.securitySolution.detonate.ai.generating',
  { defaultMessage: 'Summarising this detonation…' }
);

export const AI_SUMMARY_NO_CONNECTOR = i18n.translate(
  'xpack.securitySolution.detonate.ai.noConnector',
  { defaultMessage: 'No AI connector is configured' }
);

export const AI_SUMMARY_NO_CONNECTOR_BODY = i18n.translate(
  'xpack.securitySolution.detonate.ai.noConnectorBody',
  {
    defaultMessage:
      'Configure a generative AI connector to summarise detonations and extract indicators of compromise.',
  }
);

export const AI_SUMMARY_ERROR = i18n.translate('xpack.securitySolution.detonate.ai.error', {
  defaultMessage: 'The summary could not be generated',
});

export const AI_SUMMARY_IOCS = i18n.translate('xpack.securitySolution.detonate.ai.iocs', {
  defaultMessage: 'Indicators of compromise',
});

export const AI_SUMMARY_ACTIONS = i18n.translate('xpack.securitySolution.detonate.ai.actions', {
  defaultMessage: 'Recommended actions',
});

export const AI_SUMMARY_DISCLAIMER = i18n.translate(
  'xpack.securitySolution.detonate.ai.disclaimer',
  {
    defaultMessage:
      'Generated by an LLM from this detonation’s alerts. Verify before acting on it.',
  }
);
