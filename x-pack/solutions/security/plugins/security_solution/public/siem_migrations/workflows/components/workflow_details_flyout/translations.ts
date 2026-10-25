/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const REVIEW_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.reviewCalloutTitle',
  {
    defaultMessage: '2 steps need review — connector or API configuration required',
  }
);

export const ORIGINAL_STEPS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.originalSteps',
  {
    defaultMessage: 'Original steps',
  }
);

export const ELASTIC_WORKFLOWS = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.elasticWorkflows',
  {
    defaultMessage: 'Elastic workflow',
  }
);

export const VIEW_TOGGLE_LEGEND = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.viewToggleLegend',
  {
    defaultMessage: 'Elastic workflow view',
  }
);

export const GRAPH_VIEW = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.graphView',
  {
    defaultMessage: 'Graph',
  }
);

export const YAML_VIEW = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.yamlView',
  {
    defaultMessage: 'YAML',
  }
);

export const EDITABLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.editable',
  {
    defaultMessage: 'Editable',
  }
);

export const MAPPED = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.mapped',
  {
    defaultMessage: 'Mapped',
  }
);

export const NEEDS_REVIEW = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.needsReview',
  {
    defaultMessage: 'Needs review',
  }
);

export const CANCEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.cancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const RESET_YAML = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.resetYaml',
  {
    defaultMessage: 'Reset YAML',
  }
);

export const SAVE_AS_WORKFLOW = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.saveAsWorkflow',
  {
    defaultMessage: 'Save as Workflow',
  }
);

export const SAVE_AND_RUN = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.saveAndRun',
  {
    defaultMessage: 'Save and run',
  }
);

export const FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.title',
  {
    defaultMessage: 'Phishing Email — End-to-End Response',
  }
);

export const SOURCE_SUBTITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.sourceSubtitle',
  {
    defaultMessage: 'Tines Story → Elastic Workflows · Alert Trigger · 8 steps',
  }
);

export const TRANSLATION_TAB = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.translationTab',
  {
    defaultMessage: 'Translation',
  }
);

export const SUMMARY_TAB = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryTab',
  {
    defaultMessage: 'Summary',
  }
);

export const SUMMARY_ASSISTANT_CREATED = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryAssistantCreated',
  {
    defaultMessage: 'Assistant created a final translation May 18, 2026',
  }
);

export const SUMMARY_MATCHING_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryMatchingTitle',
  {
    defaultMessage: 'Prebuilt Workflow Matching Summary',
  }
);

export const SUMMARY_MATCHING_INTRO = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryMatchingIntro',
  {
    defaultMessage:
      'The Splunk workflow "Risk - 7 Day ATT&CK Tactic Threshold Exceeded - Workflow" is matched with the Elastic workflow "Multiple Alerts in Same ATT&CK Tactic by Host" because both workflows share the core detection logic of:',
  }
);

export const SUMMARY_ITEM_1_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem1Title',
  {
    defaultMessage: 'Aggregating security alerts by ATT&CK tactics',
  }
);

export const SUMMARY_ITEM_1_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem1Description',
  {
    defaultMessage:
      'Both workflows correlate multiple security events/alerts that are tagged with MITRE ATT&CK tactics and techniques.',
  }
);

export const SUMMARY_ITEM_2_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem2Title',
  {
    defaultMessage: 'Threshold-based detection',
  }
);

export const SUMMARY_ITEM_2_DESCRIPTION_PREFIX = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem2DescriptionPrefix',
  {
    defaultMessage: 'The Splunk workflow requires',
  }
);

export const SUMMARY_ITEM_2_DESCRIPTION_MIDDLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem2DescriptionMiddle',
  {
    defaultMessage: 'and',
  }
);

export const SUMMARY_ITEM_2_DESCRIPTION_SUFFIX = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem2DescriptionSuffix',
  {
    defaultMessage: ', while the Elastic workflow requires',
  }
);

export const SUMMARY_ITEM_2_DESCRIPTION_END = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem2DescriptionEnd',
  {
    defaultMessage: ', both using minimum thresholds to identify concentrated malicious activity.',
  }
);

export const SUMMARY_ITEM_3_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem3Title',
  {
    defaultMessage: 'Risk scoring and correlation',
  }
);

export const SUMMARY_ITEM_3_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem3Description',
  {
    defaultMessage:
      'Both workflows aggregate risk scores and events from multiple detection sources to identify objects (hosts/users) exhibiting suspicious behavior patterns.',
  }
);

export const SUMMARY_ITEM_4_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem4Title',
  {
    defaultMessage: 'Entity-based grouping',
  }
);

export const SUMMARY_ITEM_4_DESCRIPTION_PREFIX = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem4DescriptionPrefix',
  {
    defaultMessage: 'Both workflows group by',
  }
);

export const SUMMARY_ITEM_4_DESCRIPTION_MIDDLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem4DescriptionMiddle',
  {
    defaultMessage: 'and',
  }
);

export const SUMMARY_ITEM_4_DESCRIPTION_SUFFIX = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem4DescriptionSuffix',
  {
    defaultMessage: ', while the Elastic workflow groups by',
  }
);

export const SUMMARY_ITEM_4_DESCRIPTION_END = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem4DescriptionEnd',
  {
    defaultMessage:
      'and tactic name, both focusing on identifying entities with multiple related alerts.',
  }
);

export const SUMMARY_ITEM_5_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem5Title',
  {
    defaultMessage: 'Higher-order detection',
  }
);

export const SUMMARY_ITEM_5_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryItem5Description',
  {
    defaultMessage:
      'Both are meta-detection workflows that correlate existing alerts rather than detecting raw events directly, making them suitable for identifying potential compromises through behavioral patterns.',
  }
);

export const SUMMARY_CONCLUSION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.detailsFlyout.summaryConclusion',
  {
    defaultMessage:
      'The primary difference is the time window (7 days in Splunk vs configurable in Elastic), but the fundamental detection methodology and use case are nearly identical.',
  }
);
