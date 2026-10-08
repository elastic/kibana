/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
} from '@kbn/alertzero-common';

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

export const contextEngineDescription = (workerId: string): string => {
  switch (workerId) {
    case SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID:
      return i18n.translate('xpack.alertzero.workerDependencies.contextEngineCoverageDescription', {
        defaultMessage:
          'Context Engine is off, so this Worker cannot process coverage records from Continuous Threat Hunt.',
      });
    case SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID:
      return i18n.translate('xpack.alertzero.workerDependencies.contextEngineAttackDescription', {
        defaultMessage:
          'Context Engine is off, so Attack Discovery cannot hand findings to Endpoint Analysis.',
      });
    case SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID:
      return i18n.translate('xpack.alertzero.workerDependencies.contextEngineEndpointDescription', {
        defaultMessage:
          'Context Engine is off, so Endpoint Analysis cannot read or update its investigation records.',
      });
    default:
      return i18n.translate('xpack.alertzero.workerDependencies.contextEngineHuntDescription', {
        defaultMessage:
          'Context Engine is off. Continuous Threat Hunt can still find threats, but cannot write coverage records for Rule Coverage.',
      });
  }
};

export const ADVANCED_SETTINGS_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.advancedSettingsLinkText',
  { defaultMessage: 'Open Advanced Settings' }
);

export const ALERT_ANALYSIS_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisLabel',
  { defaultMessage: 'Alert analysis' }
);

export const ALERT_ANALYSIS_WORKFLOW_DESCRIPTION = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisWorkflowDescription',
  {
    defaultMessage:
      'The Alert Analysis workflow is missing or disabled, so Alert Triage cannot run.',
  }
);

export const ALERT_ANALYSIS_RUNTIME_DESCRIPTION = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisRuntimeDescription',
  { defaultMessage: 'Alert analysis is off for this space, so Alert Triage cannot analyze alerts.' }
);

export const ALERT_ANALYSIS_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisLinkText',
  { defaultMessage: 'Open Alert analysis settings' }
);

export const ATTACK_DISCOVERY_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.attackDiscoveryLabel',
  { defaultMessage: 'Attack Discovery workflows' }
);

export const ATTACK_DISCOVERY_DESCRIPTION = i18n.translate(
  'xpack.alertzero.workerDependencies.attackDiscoveryDescription',
  {
    defaultMessage:
      'Attack Discovery workflows are off for this space, so this Worker cannot generate discoveries.',
  }
);

export const ATTACK_DISCOVERY_DEPLOYMENT_DESCRIPTION = i18n.translate(
  'xpack.alertzero.workerDependencies.attackDiscoveryDeploymentDescription',
  {
    defaultMessage:
      'Attack Discovery workflows are unavailable for this deployment. Ask an administrator to enable them.',
  }
);

export const ATTACK_DISCOVERY_RELOAD_NOTE = i18n.translate(
  'xpack.alertzero.workerDependencies.attackDiscoveryReloadNote',
  {
    defaultMessage:
      'Attack Discovery workflows are enabled. Refresh this page when convenient to update other Attack Discovery controls.',
  }
);

export const DEFEND_LABEL = i18n.translate('xpack.alertzero.workerDependencies.defendLabel', {
  defaultMessage: 'Elastic Defend',
});

export const DEFEND_DESCRIPTION = i18n.translate(
  'xpack.alertzero.workerDependencies.defendDescription',
  {
    defaultMessage:
      'No Elastic Defend integration policy is configured in this space. Endpoint Analysis needs one to investigate hosts.',
  }
);

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

export const THREAT_WORKFLOW_DESCRIPTION = (workflowName: string): string =>
  i18n.translate('xpack.alertzero.workerDependencies.threatWorkflowDescription', {
    defaultMessage:
      'The global {workflowName} workflow is disabled, so Continuous Threat Hunt may have no reports to investigate.',
    values: { workflowName },
  });

export const THREAT_WORKFLOW_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.threatWorkflowLinkText',
  { defaultMessage: 'Open workflow' }
);

export const unableToVerifyDescription = (dependencyName: string): string =>
  i18n.translate('xpack.alertzero.workerDependencies.unableToVerifyDescription', {
    defaultMessage:
      'Could not verify {dependencyName}. Try again or ask an administrator to check access.',
    values: { dependencyName },
  });

export const unableToVerifyThreatWorkflowDescription = (workflowName: string): string =>
  i18n.translate('xpack.alertzero.workerDependencies.unableToVerifyThreatWorkflowDescription', {
    defaultMessage:
      'Could not verify the global {workflowName} workflow. Try again or ask an administrator to check access and restore it if missing.',
    values: { workflowName },
  });

export const WORKFLOWS_LIST_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.workflowsListLinkText',
  { defaultMessage: 'Open Workflows' }
);
