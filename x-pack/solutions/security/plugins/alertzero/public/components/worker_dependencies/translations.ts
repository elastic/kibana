/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MISSING_TITLE = i18n.translate('xpack.alertzero.workerDependencies.missingTitle', {
  defaultMessage: 'Worker setup needs attention',
});

export const UNKNOWN_TITLE = i18n.translate('xpack.alertzero.workerDependencies.unknownTitle', {
  defaultMessage: 'Could not verify worker setup',
});

export const RETRY_BUTTON_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.retryButtonLabel',
  { defaultMessage: 'Retry checks' }
);

export const ENABLE_BUTTON_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.enableButtonLabel',
  { defaultMessage: 'Enable' }
);

export const enableDependencyButtonLabel = (dependencyName: string): string =>
  i18n.translate('xpack.alertzero.workerDependencies.enableDependencyButtonLabel', {
    defaultMessage: 'Enable {dependencyName}',
    values: { dependencyName },
  });

export const dependencyEnabledTitle = (dependencyName: string): string =>
  i18n.translate('xpack.alertzero.workerDependencies.dependencyEnabledTitle', {
    defaultMessage: '{dependencyName} enabled',
    values: { dependencyName },
  });

export const enableDependencyFailedTitle = (dependencyName: string): string =>
  i18n.translate('xpack.alertzero.workerDependencies.enableDependencyFailedTitle', {
    defaultMessage: 'Could not enable {dependencyName}',
    values: { dependencyName },
  });

export const enableDependencyFailedDescription = (dependencyName: string): string =>
  i18n.translate('xpack.alertzero.workerDependencies.enableDependencyFailedDescription', {
    defaultMessage: 'Could not enable {dependencyName}. Try again or use the link.',
    values: { dependencyName },
  });

export const CONTEXT_ENGINE_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.contextEngineLabel',
  { defaultMessage: 'Context Engine' }
);

export const ADVANCED_SETTINGS_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.advancedSettingsLinkText',
  { defaultMessage: 'Open Advanced Settings' }
);

export const ALERT_ANALYSIS_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisLabel',
  { defaultMessage: 'Alert analysis' }
);

export const ALERT_ANALYSIS_WORKFLOW_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisWorkflowLabel',
  { defaultMessage: 'Alert Analysis workflow' }
);

export const ALERT_ANALYSIS_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisLinkText',
  { defaultMessage: 'Open Alert analysis settings' }
);

export const ATTACK_DISCOVERY_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.attackDiscoveryLabel',
  { defaultMessage: 'Attack Discovery workflows' }
);

export const DEFEND_LABEL = i18n.translate('xpack.alertzero.workerDependencies.defendLabel', {
  defaultMessage: 'Elastic Defend',
});

export const DEFEND_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.defendLinkText',
  { defaultMessage: 'Set up Elastic Defend' }
);

export const INGEST_WORKFLOW_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.ingestWorkflowLabel',
  { defaultMessage: 'Ingest threat feeds' }
);

export const ENRICH_WORKFLOW_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.enrichWorkflowLabel',
  { defaultMessage: 'Enrich threat report' }
);

export const THREAT_WORKFLOW_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.threatWorkflowLinkText',
  { defaultMessage: 'Open workflow' }
);

export const WORKFLOWS_LIST_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.workflowsListLinkText',
  { defaultMessage: 'Open Workflows' }
);
