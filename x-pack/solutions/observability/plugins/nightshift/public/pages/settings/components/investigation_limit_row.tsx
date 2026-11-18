/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFormHelpText, EuiFormLabel, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InvestigationQuotaGroup } from '@kbn/nightshift-investigations-plugin/common';
import {
  isValidFiniteInvestigationLimit,
  MAX_RUN_LIMIT,
  MIN_INVESTIGATION_LIMIT,
  parseInvestigationLimitDraft,
  type InvestigationLimitDraft,
} from './investigation_limit_draft';

export const INVESTIGATION_QUOTA_GROUP_LABELS: Record<InvestigationQuotaGroup, string> = {
  automatic_investigation: i18n.translate(
    'xpack.nightshift.settings.runLimits.automaticInvestigationsRowTitle',
    { defaultMessage: 'Automatic investigations' }
  ),
  manual_investigation: i18n.translate(
    'xpack.nightshift.settings.runLimits.manualInvestigationsRowTitle',
    { defaultMessage: 'Manual investigations' }
  ),
  total_investigation: i18n.translate(
    'xpack.nightshift.settings.runLimits.allInvestigationsRowTitle',
    { defaultMessage: 'All investigations' }
  ),
};

const INVESTIGATION_QUOTA_GROUP_DESCRIPTIONS: Record<InvestigationQuotaGroup, string> = {
  automatic_investigation: i18n.translate(
    'xpack.nightshift.settings.runLimits.automaticInvestigationsRowDescription',
    { defaultMessage: 'All automations combined.' }
  ),
  manual_investigation: i18n.translate(
    'xpack.nightshift.settings.runLimits.manualInvestigationsRowDescription',
    { defaultMessage: 'Started from the home page, a Slack mention, the API or the CLI.' }
  ),
  total_investigation: i18n.translate(
    'xpack.nightshift.settings.runLimits.allInvestigationsRowDescription',
    {
      defaultMessage:
        'Automatic and manual investigations together. It can be lower than the two limits added up.',
    }
  ),
};

export const InvestigationLimitRow = ({
  group,
  count,
  limit,
  disabled,
  enforced,
  onChange,
}: {
  group: InvestigationQuotaGroup;
  count: number;
  limit: InvestigationLimitDraft;
  disabled: boolean;
  /** Whether the section's switch is on. Off, the limit is shown as text, not as an input. */
  enforced: boolean;
  onChange: (limit: InvestigationLimitDraft) => void;
}) => {
  const invalid = enforced && limit !== '' && !isValidFiniteInvestigationLimit(limit);
  const groupLabel = INVESTIGATION_QUOTA_GROUP_LABELS[group];
  const dailyLimitLabel = i18n.translate(
    'xpack.nightshift.settings.runLimits.dailyLimitInputLabel',
    { defaultMessage: '{group} daily limit', values: { group: groupLabel } }
  );
  const countDescription = (
    <>
      <span>{INVESTIGATION_QUOTA_GROUP_DESCRIPTIONS[group]} </span>
      <span data-test-subj={`nightshiftRunLimitCount-${group}`}>
        {i18n.translate('xpack.nightshift.settings.runLimits.investigationCountDescription', {
          defaultMessage:
            '{count, plural, one {# investigation started today} other {# investigations started today}}',
          values: { count },
        })}
      </span>
    </>
  );

  return enforced ? (
    <EuiFormRow
      label={dailyLimitLabel}
      helpText={countDescription}
      isInvalid={invalid}
      error={
        invalid
          ? i18n.translate('xpack.nightshift.settings.runLimits.invalidLimitErrorMessage', {
              defaultMessage: 'Enter a whole number from {minimum} to {maximum}.',
              values: { minimum: MIN_INVESTIGATION_LIMIT, maximum: MAX_RUN_LIMIT },
            })
          : undefined
      }
      data-test-subj={`nightshiftRunLimitRow-${group}`}
    >
      <EuiFieldNumber
        compressed
        aria-label={i18n.translate('xpack.nightshift.settings.runLimits.dailyLimitInputAriaLabel', {
          defaultMessage: 'Daily limit for {group}',
          values: { group: groupLabel },
        })}
        data-test-subj={`nightshiftRunLimitInput-${group}`}
        value={limit}
        placeholder={i18n.translate('xpack.nightshift.settings.runLimits.noLimitPlaceholder', {
          defaultMessage: 'No limit',
        })}
        min={MIN_INVESTIGATION_LIMIT}
        max={MAX_RUN_LIMIT}
        step={1}
        isInvalid={invalid}
        disabled={disabled}
        onChange={(event) => {
          const next = parseInvestigationLimitDraft(event.target.value);
          // A limit of 0 would deny every start, so it is not a value the input can hold.
          if (next !== 0) {
            onChange(next);
          }
        }}
      />
    </EuiFormRow>
  ) : (
    <div data-test-subj={`nightshiftRunLimitRow-${group}`}>
      <EuiFormLabel type="span">{dailyLimitLabel}</EuiFormLabel>
      <EuiFormHelpText>{countDescription}</EuiFormHelpText>
    </div>
  );
};
