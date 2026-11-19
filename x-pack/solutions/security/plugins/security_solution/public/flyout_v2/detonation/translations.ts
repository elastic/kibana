/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DETONATION_REPORT_TITLE = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.reportTitle',
  { defaultMessage: 'Detonation report' }
);
export const DETONATE_ACTION = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.detonateAction',
  { defaultMessage: 'Detonate' }
);
export const DETONATING = i18n.translate('xpack.securitySolution.flyoutV2.detonation.detonating', {
  defaultMessage: 'Detonating',
});
export const DETONATING_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.detonatingDescription',
  { defaultMessage: "Detonating can take a few minutes, you'll be notified when it's done." }
);
export const MALICIOUS = i18n.translate('xpack.securitySolution.flyoutV2.detonation.malicious', {
  defaultMessage: 'Malicious',
});
export const REPORT_ID = i18n.translate('xpack.securitySolution.flyoutV2.detonation.reportId', {
  defaultMessage: 'Report ID',
});
export const SHA_256 = i18n.translate('xpack.securitySolution.flyoutV2.detonation.sha256', {
  defaultMessage: 'SHA-256',
});
export const SUBMITTED = i18n.translate('xpack.securitySolution.flyoutV2.detonation.submitted', {
  defaultMessage: 'Submitted',
});
export const SOURCE = i18n.translate('xpack.securitySolution.flyoutV2.detonation.source', {
  defaultMessage: 'Source',
});
export const WHY_THIS_VERDICT = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.whyThisVerdict',
  { defaultMessage: 'Why this verdict' }
);
export const NETWORK_ACTIVITY = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.networkActivity',
  { defaultMessage: 'Network activity' }
);
export const FILE_AND_SYSTEM_ACTIVITY = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.fileAndSystemActivity',
  { defaultMessage: 'File and system activity' }
);
export const SURICATA_AND_YARA = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.suricataAndYara',
  { defaultMessage: 'Suricata and YARA matches' }
);
export const FILE_CONTEXT = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.fileContext',
  { defaultMessage: 'File context' }
);
export const ENRICHMENT = i18n.translate('xpack.securitySolution.flyoutV2.detonation.enrichment', {
  defaultMessage: 'Enrichment',
});
export const OPTIONAL = i18n.translate('xpack.securitySolution.flyoutV2.detonation.optional', {
  defaultMessage: 'Optional',
});
export const DOMAIN_OR_IP = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.domainOrIp',
  { defaultMessage: 'Domain / IP' }
);
export const PORT = i18n.translate('xpack.securitySolution.flyoutV2.detonation.port', {
  defaultMessage: 'Port',
});
export const FLAG = i18n.translate('xpack.securitySolution.flyoutV2.detonation.flag', {
  defaultMessage: 'Flag',
});
export const ACTION = i18n.translate('xpack.securitySolution.flyoutV2.detonation.action', {
  defaultMessage: 'Action',
});
export const PATH = i18n.translate('xpack.securitySolution.flyoutV2.detonation.path', {
  defaultMessage: 'Path',
});
export const FILE = i18n.translate('xpack.securitySolution.flyoutV2.detonation.file', {
  defaultMessage: 'File',
});
export const RELATION = i18n.translate('xpack.securitySolution.flyoutV2.detonation.relation', {
  defaultMessage: 'Relation',
});
export const VERDICT = i18n.translate('xpack.securitySolution.flyoutV2.detonation.verdict', {
  defaultMessage: 'Verdict',
});
export const RELATED_FILES = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.relatedFiles',
  { defaultMessage: 'Related files' }
);
export const SURICATA = i18n.translate('xpack.securitySolution.flyoutV2.detonation.suricata', {
  defaultMessage: 'Suricata',
});
export const YARA = i18n.translate('xpack.securitySolution.flyoutV2.detonation.yara', {
  defaultMessage: 'YARA',
});
export const THREAT_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.threatScore',
  { defaultMessage: 'Threat score 92 / 100 · High confidence' }
);
export const FILE_CONTEXT_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.fileContextCalloutTitle',
  { defaultMessage: 'Created 6 days ago' }
);
export const FILE_CONTEXT_CALLOUT_TEXT = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.fileContextCalloutText',
  { defaultMessage: 'Files under 30 days old are treated as more suspicious.' }
);
export const COPY_PERMALINK = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.copyPermalink',
  { defaultMessage: 'Copy permalink' }
);
export const OPEN_FULL_REPORT = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.openFullReport',
  { defaultMessage: 'Open full report' }
);
export const TAB_FILES = i18n.translate('xpack.securitySolution.flyoutV2.detonation.tabFiles', {
  defaultMessage: 'Files',
});
export const TAB_PROCESSES = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.tabProcesses',
  { defaultMessage: 'Processes' }
);
export const TAB_REGISTRY = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.tabRegistry',
  { defaultMessage: 'Registry' }
);
export const TAB_ALL = i18n.translate('xpack.securitySolution.flyoutV2.detonation.tabAll', {
  defaultMessage: 'All',
});
export const COPY_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.copyToClipboard',
  { defaultMessage: 'Copy to clipboard' }
);

export const AI_SUMMARY = i18n.translate('xpack.securitySolution.flyoutV2.detonation.aiSummary', {
  defaultMessage: 'AI summary',
});
export const AFFECTED_ENTITIES = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.affectedEntities',
  { defaultMessage: 'Affected entities' }
);
export const RECOMMENDED_ACTIONS = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.recommendedActions',
  { defaultMessage: 'Recommended actions' }
);
export const GENERATED_BY_AI = (timestamp: string) =>
  i18n.translate('xpack.securitySolution.flyoutV2.detonation.generatedByAi', {
    defaultMessage: 'Generated by AI on {timestamp}',
    values: { timestamp },
  });
export const COPY_SUMMARY = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.copySummary',
  { defaultMessage: 'Copy summary' }
);
export const RISK_LABEL = (risk: string, score: number) =>
  i18n.translate('xpack.securitySolution.flyoutV2.detonation.riskLabel', {
    defaultMessage: '{risk} risk · {score}',
    values: { risk, score },
  });

export const HIGHLIGHTED_FIELDS = i18n.translate(
  'xpack.securitySolution.flyoutV2.detonation.highlightedFields',
  { defaultMessage: 'Highlighted fields' }
);
export const FIELD = i18n.translate('xpack.securitySolution.flyoutV2.detonation.fieldColumn', {
  defaultMessage: 'Field',
});
export const VALUE = i18n.translate('xpack.securitySolution.flyoutV2.detonation.valueColumn', {
  defaultMessage: 'Value',
});
export const EDIT = i18n.translate('xpack.securitySolution.flyoutV2.detonation.edit', {
  defaultMessage: 'Edit',
});
