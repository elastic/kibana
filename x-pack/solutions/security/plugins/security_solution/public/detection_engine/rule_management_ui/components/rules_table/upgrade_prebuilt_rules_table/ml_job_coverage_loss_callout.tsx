/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

/**
 * Informational callout shown in the rule upgrade flyout when upgrading a rule would repoint it
 * away from a legacy ("affected") machine learning job it currently references, potentially causing
 * a detection-coverage gap. It's purely informational and rendered identically on all licenses.
 */
export function MlJobCoverageLossCallout(): JSX.Element {
  return (
    <EuiCallOut
      title={ML_JOB_COVERAGE_LOSS_CALLOUT_TITLE}
      size="s"
      color="warning"
      iconType="warning"
      data-test-subj="mlJobCoverageLossCallout"
    >
      <p>{ML_JOB_COVERAGE_LOSS_CALLOUT_BODY}</p>
    </EuiCallOut>
  );
}

const ML_JOB_COVERAGE_LOSS_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.mlCoverageLossCallout.title',
  {
    defaultMessage: 'Updating this rule may reduce machine learning detection coverage',
  }
);

const ML_JOB_COVERAGE_LOSS_CALLOUT_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.upgradeRules.mlCoverageLossCallout.body',
  {
    defaultMessage:
      'This rule uses a machine learning job from an earlier generation that the updated rule no longer references. Updating repoints the rule to a newer machine learning job, so it will stop using your existing job and its anomaly detection coverage may be lost. To keep that coverage, duplicate or recreate this rule before updating.',
  }
);
