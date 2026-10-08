/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RunQuotaGroup } from '@kbn/significant-events-plugin/common';
import {
  MAX_RUN_LIMIT,
  isValidLimitedRunLimitDraft,
  parseRunLimitDraft,
  type RunLimitDraft,
} from './run_limit_draft';

const MIN_LIMITED_RUN_LIMIT = 1;

export const RUN_QUOTA_GROUP_LABELS: Record<RunQuotaGroup, string> = {
  detection: i18n.translate('xpack.nightshift.settings.runLimits.discoveryRowTitle', {
    defaultMessage: 'Discovery',
  }),
  investigation: i18n.translate('xpack.nightshift.settings.runLimits.investigationRowTitle', {
    defaultMessage: 'Investigation',
  }),
  ki_extraction: i18n.translate(
    'xpack.nightshift.settings.runLimits.knowledgeIndicatorExtractionRowTitle',
    { defaultMessage: 'Knowledge indicators extraction' }
  ),
};

interface RunLimitRowProps {
  group: RunQuotaGroup;
  count: number;
  limit: RunLimitDraft;
  disabled: boolean;
  onChange: (limit: RunLimitDraft) => void;
  onEnabledChange: (enabled: boolean) => void;
}

export const RunLimitRow = ({
  group,
  count,
  limit,
  disabled,
  onChange,
  onEnabledChange,
}: RunLimitRowProps) => {
  const limitEnabled = limit !== 0;
  const invalid = limitEnabled && !isValidLimitedRunLimitDraft(limit);

  return (
    <>
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('xpack.nightshift.settings.runLimits.enabledSwitchLabel', {
            defaultMessage: 'Enforce daily limits',
          })}
          checked={limitEnabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          data-test-subj={`nightshiftRunLimitEnabledSwitch-${group}`}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.nightshift.settings.runLimits.dailyLimitInputLabel', {
          defaultMessage: '{group} daily limit',
          values: { group: RUN_QUOTA_GROUP_LABELS[group] },
        })}
        helpText={
          <span data-test-subj={`nightshiftRunLimitCount-${group}`}>
            {i18n.translate('xpack.nightshift.settings.runLimits.countDescription', {
              defaultMessage:
                '{count, plural, one {# counted scheduled admission today} other {# counted scheduled admissions today}}',
              values: { count },
            })}
          </span>
        }
        isInvalid={invalid}
        error={
          invalid
            ? i18n.translate('xpack.nightshift.settings.runLimits.invalidLimitErrorMessage', {
                defaultMessage: 'Enter a whole number from {minimum} to {maximum}.',
                values: { minimum: MIN_LIMITED_RUN_LIMIT, maximum: MAX_RUN_LIMIT },
              })
            : undefined
        }
        data-test-subj={`nightshiftRunLimitRow-${group}`}
      >
        {limitEnabled ? (
          <EuiFieldNumber
            compressed
            aria-label={i18n.translate(
              'xpack.nightshift.settings.runLimits.dailyLimitInputAriaLabel',
              {
                defaultMessage: 'Daily limit for {group}',
                values: { group: RUN_QUOTA_GROUP_LABELS[group] },
              }
            )}
            data-test-subj={`nightshiftRunLimitInput-${group}`}
            value={limit}
            min={MIN_LIMITED_RUN_LIMIT}
            max={MAX_RUN_LIMIT}
            step={1}
            isInvalid={invalid}
            disabled={disabled}
            onChange={(event) => {
              const nextLimit = parseRunLimitDraft(event.target.value);
              if (nextLimit !== 0) {
                onChange(nextLimit);
              }
            }}
          />
        ) : (
          <span />
        )}
      </EuiFormRow>
    </>
  );
};
