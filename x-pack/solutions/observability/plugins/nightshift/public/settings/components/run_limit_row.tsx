/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import {
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  isValidRunLimitDraft,
  parseRunLimitDraft,
  type RunLimitDraft,
} from './run_limit_draft';

export const RUN_QUOTA_GROUP_LABELS: Record<RunQuotaGroup, string> = {
  detection: i18n.translate('xpack.nightshift.settings.runLimits.discoveryRowTitle', {
    defaultMessage: 'Discovery',
  }),
  investigation: i18n.translate('xpack.nightshift.settings.runLimits.investigationRowTitle', {
    defaultMessage: 'Investigation',
  }),
  ki_extraction: i18n.translate(
    'xpack.nightshift.settings.runLimits.knowledgeIndicatorExtractionRowTitle',
    { defaultMessage: 'Knowledge indicator extraction' }
  ),
};

interface RunLimitRowProps {
  group: RunQuotaGroup;
  count: number;
  limit: RunLimitDraft;
  disabled: boolean;
  onChange: (limit: RunLimitDraft) => void;
}

export const RunLimitRow = ({ group, count, limit, disabled, onChange }: RunLimitRowProps) => {
  const invalid = !isValidRunLimitDraft(limit);

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.nightshift.settings.runLimits.dailyLimitInputLabel', {
        defaultMessage: '{group} daily limit',
        values: { group: RUN_QUOTA_GROUP_LABELS[group] },
      })}
      helpText={
        <>
          <span data-test-subj={`nightshiftRunLimitCount-${group}`}>
            {i18n.translate('xpack.nightshift.settings.runLimits.countDescription', {
              defaultMessage:
                '{count, plural, one {# counted scheduled admission today} other {# counted scheduled admissions today}}',
              values: { count },
            })}
          </span>{' '}
          <span>
            {i18n.translate('xpack.nightshift.settings.runLimits.unlimitedHelpText', {
              defaultMessage: '0 means unlimited.',
            })}
          </span>
        </>
      }
      isInvalid={invalid}
      error={
        invalid
          ? i18n.translate('xpack.nightshift.settings.runLimits.invalidLimitErrorMessage', {
              defaultMessage: 'Enter a whole number from {minimum} to {maximum}.',
              values: { minimum: MIN_RUN_LIMIT, maximum: MAX_RUN_LIMIT },
            })
          : undefined
      }
      data-test-subj={`nightshiftRunLimitRow-${group}`}
    >
      <EuiFieldNumber
        fullWidth
        compressed
        aria-label={i18n.translate('xpack.nightshift.settings.runLimits.dailyLimitInputAriaLabel', {
          defaultMessage: 'Daily limit for {group}',
          values: { group: RUN_QUOTA_GROUP_LABELS[group] },
        })}
        data-test-subj={`nightshiftRunLimitInput-${group}`}
        value={limit}
        min={MIN_RUN_LIMIT}
        max={MAX_RUN_LIMIT}
        step={1}
        isInvalid={invalid}
        disabled={disabled}
        onChange={(event) => onChange(parseRunLimitDraft(event.target.value))}
      />
    </EuiFormRow>
  );
};
