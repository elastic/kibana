/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  type KbnCalloutProps,
} from '@kbn/ui-callout';
import type { CoreWebVitalsAssessment as Assessment } from '../../../../common/types/scorecard';
import { VITAL_LABELS } from '../../../utils/web_vitals';

const TITLES: Record<Assessment['status'], string> = {
  passed: i18n.translate('xpack.digitalExperience.report.scorecard.assessment.passed', {
    defaultMessage: 'Passes the Core Web Vitals assessment',
  }),
  failed: i18n.translate('xpack.digitalExperience.report.scorecard.assessment.failed', {
    defaultMessage: 'Fails the Core Web Vitals assessment',
  }),
  notAssessed: i18n.translate('xpack.digitalExperience.report.scorecard.assessment.notAssessed', {
    defaultMessage: 'Not enough samples to assess the Core Web Vitals',
  }),
};

const CALLOUTS: Record<Assessment['status'], React.ComponentType<KbnCalloutProps>> = {
  passed: KbnSuccessCallout,
  failed: KbnDangerCallout,
  notAssessed: KbnInfoCallout,
};

const RESULTS: Record<Assessment['status'], string> = {
  passed: i18n.translate('xpack.digitalExperience.report.scorecard.assessment.passedResult', {
    defaultMessage: 'passed',
  }),
  failed: i18n.translate('xpack.digitalExperience.report.scorecard.assessment.failedResult', {
    defaultMessage: 'failed',
  }),
  notAssessed: i18n.translate(
    'xpack.digitalExperience.report.scorecard.assessment.notAssessedResult',
    { defaultMessage: 'not assessed' }
  ),
};

const RULE = i18n.translate('xpack.digitalExperience.report.scorecard.assessment.rule', {
  defaultMessage:
    "Google's test: LCP, INP and CLS all good at the 75th percentile, INP only when it has samples.",
});

/** Whether this period passes Google's Core Web Vitals assessment, and whether the previous did. */
export function CoreWebVitalsAssessment({
  current,
  previous,
}: {
  current: Assessment;
  previous: Assessment;
}) {
  const { status, failing } = current;
  const Callout = CALLOUTS[status];
  return (
    <Callout
      data-test-subj="digitalExperienceScorecardAssessment"
      data-status={status}
      size="s"
      title={TITLES[status]}
      text={
        <>
          {failing.length > 0 && (
            <p>
              {i18n.translate('xpack.digitalExperience.report.scorecard.assessment.failing', {
                defaultMessage: 'Not good at the 75th percentile: {vitals}.',
                values: { vitals: failing.map((vital) => VITAL_LABELS[vital]).join(', ') },
              })}
            </p>
          )}
          <p>
            {i18n.translate('xpack.digitalExperience.report.scorecard.assessment.previous', {
              defaultMessage: 'Previous period: {result}. {rule}',
              values: { result: RESULTS[previous.status], rule: RULE },
            })}
          </p>
        </>
      }
    />
  );
}
