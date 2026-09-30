/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface WorkerDependencyNames {
  providerName: string;
  dependentName: string;
}

/* -------------------------------------------------------------------------- */
/* Disable dialog                                                             */
/* -------------------------------------------------------------------------- */

export const disableWorkerTitle = (workerName: string) =>
  i18n.translate('xpack.alertzero.watches.workerDependencies.disableDialog.title', {
    defaultMessage: 'Disable {workerName}?',
    values: { workerName },
  });

export const DISABLE_DIALOG_CANCEL = i18n.translate(
  'xpack.alertzero.watches.workerDependencies.disableDialog.cancel',
  { defaultMessage: 'Cancel' }
);

export const DISABLE_DIALOG_CONFIRM = i18n.translate(
  'xpack.alertzero.watches.workerDependencies.disableDialog.confirm',
  { defaultMessage: 'Disable Worker' }
);

/* -------------------------------------------------------------------------- */
/* Header warning icon                                                        */
/* -------------------------------------------------------------------------- */

export const workerWarningAriaLabel = (workerName: string) =>
  i18n.translate('xpack.alertzero.watches.workerDependencies.warningIcon.ariaLabel', {
    defaultMessage: 'Warnings for {workerName}',
    values: { workerName },
  });

/* -------------------------------------------------------------------------- */
/* Post-save notice                                                           */
/* -------------------------------------------------------------------------- */

export const blockedAfterSaveTitle = (workerName: string) =>
  i18n.translate('xpack.alertzero.watches.workerDependencies.blockedAfterSave.title', {
    defaultMessage: "Saved — but {workerName} won't run yet",
    values: { workerName },
  });

export const BLOCKED_AFTER_SAVE_ACKNOWLEDGE = i18n.translate(
  'xpack.alertzero.watches.workerDependencies.blockedAfterSave.acknowledge',
  { defaultMessage: 'Got it' }
);

/* -------------------------------------------------------------------------- */
/* Continuous Threat Hunt → Rule Coverage                                     */
/* -------------------------------------------------------------------------- */

export const huntToRuleCoverageProviderReason = ({ dependentName }: WorkerDependencyNames) =>
  i18n.translate('xpack.alertzero.watches.workerDependencies.huntToRuleCoverage.providerReason', {
    defaultMessage: '{dependentName} is enabled but has no gap signals while this Worker is off.',
    values: { dependentName },
  });

export const huntToRuleCoverageDependentReason = ({ providerName }: WorkerDependencyNames) =>
  i18n.translate('xpack.alertzero.watches.workerDependencies.huntToRuleCoverage.dependentReason', {
    defaultMessage: '{providerName} is disabled — no gap signals to act on.',
    values: { providerName },
  });

/* -------------------------------------------------------------------------- */
/* Attack Discovery → Endpoint Analysis                                       */
/* -------------------------------------------------------------------------- */

export const attackDiscoveryToEndpointAnalysisProviderReason = ({
  dependentName,
}: WorkerDependencyNames) =>
  i18n.translate(
    'xpack.alertzero.watches.workerDependencies.attackDiscoveryToEndpointAnalysis.providerReason',
    {
      defaultMessage:
        '{dependentName} is enabled but has nothing to analyze while this Worker is off.',
      values: { dependentName },
    }
  );

export const attackDiscoveryToEndpointAnalysisDependentReason = ({
  providerName,
}: WorkerDependencyNames) =>
  i18n.translate(
    'xpack.alertzero.watches.workerDependencies.attackDiscoveryToEndpointAnalysis.dependentReason',
    {
      defaultMessage: '{providerName} is disabled — no attacks are handed off for analysis.',
      values: { providerName },
    }
  );
