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
    defaultMessage: 'Could not enable {dependencyName}. Try again or open the setting.',
    values: { dependencyName },
  });

// --- Row grammar: "{label} {state}, so {consequence}." ---

export const STATE_OFF = i18n.translate('xpack.alertzero.workerDependencies.stateOff', {
  defaultMessage: 'is off',
});

export const STATE_OFF_PLURAL = i18n.translate(
  'xpack.alertzero.workerDependencies.stateOffPlural',
  { defaultMessage: 'are off' }
);

export const STATE_WORKFLOW_OFF = i18n.translate(
  'xpack.alertzero.workerDependencies.stateWorkflowOff',
  { defaultMessage: 'workflow is off' }
);

export const STATE_NOT_SET_UP = i18n.translate('xpack.alertzero.workerDependencies.stateNotSetUp', {
  defaultMessage: 'is not set up',
});

export const STATE_MISSING_OR_DISABLED = i18n.translate(
  'xpack.alertzero.workerDependencies.stateMissingOrDisabled',
  { defaultMessage: 'is missing or disabled' }
);

export const STATE_UNAVAILABLE = i18n.translate(
  'xpack.alertzero.workerDependencies.stateUnavailable',
  { defaultMessage: 'are unavailable for this deployment' }
);

export const UNVERIFIED_DESCRIPTION = i18n.translate(
  'xpack.alertzero.workerDependencies.unverifiedDescription',
  { defaultMessage: 'could not be verified. Try again or ask an administrator to check access.' }
);

export const UNVERIFIED_THREAT_WORKFLOW_DESCRIPTION = i18n.translate(
  'xpack.alertzero.workerDependencies.unverifiedThreatWorkflowDescription',
  {
    defaultMessage:
      'workflow could not be verified. Try again or ask an administrator to check access and restore it if missing.',
  }
);

// --- Context Engine ---

export const CONTEXT_ENGINE_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.contextEngineLabel',
  { defaultMessage: 'Context Engine' }
);

export const contextEngineSeverity = (workerId: string): 'blocked' | 'limited' =>
  workerId === SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID ||
  workerId === SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID
    ? 'blocked'
    : 'limited';

export const contextEngineConsequence = (workerId: string): string => {
  switch (workerId) {
    case SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID:
      return i18n.translate('xpack.alertzero.workerDependencies.contextEngineCoverageConsequence', {
        defaultMessage: "Rule Coverage can't process coverage records from Continuous Threat Hunt",
      });
    case SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID:
      return i18n.translate('xpack.alertzero.workerDependencies.contextEngineAttackConsequence', {
        defaultMessage: "Attack Discovery findings won't reach Endpoint Analysis",
      });
    case SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID:
      return i18n.translate('xpack.alertzero.workerDependencies.contextEngineEndpointConsequence', {
        defaultMessage: "Endpoint Analysis can't read or update investigation records",
      });
    default:
      return i18n.translate('xpack.alertzero.workerDependencies.contextEngineHuntConsequence', {
        defaultMessage: "Continuous Threat Hunt can't write coverage records for Rule Coverage",
      });
  }
};

export const ADVANCED_SETTINGS_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.advancedSettingsLinkText',
  { defaultMessage: 'Open Advanced Settings' }
);

// --- Alert analysis ---

export const ALERT_ANALYSIS_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisLabel',
  { defaultMessage: 'Alert analysis' }
);

export const ALERT_ANALYSIS_WORKFLOW_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisWorkflowLabel',
  { defaultMessage: 'Alert Analysis workflow' }
);

export const ALERT_ANALYSIS_CONSEQUENCE = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisConsequence',
  { defaultMessage: "Alert Triage can't analyze alerts" }
);

export const ALERT_ANALYSIS_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.alertAnalysisLinkText',
  { defaultMessage: 'Open Alert analysis settings' }
);

// --- Attack Discovery workflows ---

export const ATTACK_DISCOVERY_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.attackDiscoveryLabel',
  { defaultMessage: 'Attack Discovery workflows' }
);

export const ATTACK_DISCOVERY_CONSEQUENCE = i18n.translate(
  'xpack.alertzero.workerDependencies.attackDiscoveryConsequence',
  { defaultMessage: "Attack Discovery can't generate discoveries" }
);

export const ATTACK_DISCOVERY_DEPLOYMENT_CONSEQUENCE = i18n.translate(
  'xpack.alertzero.workerDependencies.attackDiscoveryDeploymentConsequence',
  { defaultMessage: 'an administrator needs to enable them' }
);

// --- Elastic Defend ---

export const DEFEND_LABEL = i18n.translate('xpack.alertzero.workerDependencies.defendLabel', {
  defaultMessage: 'Elastic Defend',
});

export const DEFEND_CONSEQUENCE = i18n.translate(
  'xpack.alertzero.workerDependencies.defendConsequence',
  { defaultMessage: "Endpoint Analysis can't investigate hosts" }
);

export const DEFEND_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.defendLinkText',
  { defaultMessage: 'Set up Elastic Defend' }
);

// --- Threat report workflows ---

export const INGEST_WORKFLOW_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.ingestWorkflowLabel',
  { defaultMessage: 'Ingest threat feeds' }
);

export const ENRICH_WORKFLOW_LABEL = i18n.translate(
  'xpack.alertzero.workerDependencies.enrichWorkflowLabel',
  { defaultMessage: 'Enrich threat report' }
);

export const THREAT_WORKFLOW_CONSEQUENCE = i18n.translate(
  'xpack.alertzero.workerDependencies.threatWorkflowConsequence',
  { defaultMessage: 'Continuous Threat Hunt may have no reports to investigate' }
);

export const THREAT_WORKFLOW_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.threatWorkflowLinkText',
  { defaultMessage: 'Open workflow' }
);

export const WORKFLOWS_LIST_LINK_TEXT = i18n.translate(
  'xpack.alertzero.workerDependencies.workflowsListLinkText',
  { defaultMessage: 'Open Workflows' }
);
