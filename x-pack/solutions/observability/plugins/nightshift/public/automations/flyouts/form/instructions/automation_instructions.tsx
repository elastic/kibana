/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiText, EuiTextArea, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_AUTOMATION_INSTRUCTIONS_LENGTH } from '@kbn/nightshift-investigations-plugin/common';
import type { TriggerFormValues } from '../automation_form_values';
import { getInstructionsError } from '../validation';

const labels = {
  additionalInstructions: i18n.translate(
    'xpack.nightshift.automations.flyout.additionalInstructionsLabel',
    { defaultMessage: 'Additional Instructions' }
  ),
  instructions: i18n.translate('xpack.nightshift.automations.flyout.scheduledInstructionsLabel', {
    defaultMessage: 'Instructions',
  }),
  optional: i18n.translate('xpack.nightshift.automations.flyout.instructionsOptionalLabel', {
    defaultMessage: 'Optional',
  }),
  required: i18n.translate('xpack.nightshift.automations.flyout.instructionsRequiredLabel', {
    defaultMessage: 'Required for scheduled automations',
  }),
  limit: i18n.translate('xpack.nightshift.automations.flyout.instructionsLimitDescription', {
    defaultMessage: 'Maximum {limit, number} characters.',
    values: { limit: MAX_AUTOMATION_INSTRUCTIONS_LENGTH },
  }),
  empty: i18n.translate('xpack.nightshift.automations.flyout.noAdditionalInstructionsDescription', {
    defaultMessage: 'No additional instructions',
  }),
  alertPlaceholder: i18n.translate(
    'xpack.nightshift.automations.flyout.alertInstructionsPlaceholder',
    {
      defaultMessage:
        'Optionally add context or priorities to guide the investigation when an alert triggers this automation…',
    }
  ),
  slackPlaceholder: i18n.translate(
    'xpack.nightshift.automations.flyout.slackInstructionsPlaceholder',
    {
      defaultMessage:
        'Optionally add context or priorities to guide the investigation when a Slack message triggers this automation…',
    }
  ),
  schedulePlaceholder: i18n.translate(
    'xpack.nightshift.automations.flyout.scheduledInstructionsPlaceholder',
    {
      defaultMessage: 'Describe what Nightshift should investigate each time this automation runs…',
    }
  ),
};

export const AutomationInstructions = ({
  instructions,
  trigger,
  onInstructionsChange,
  showValidationErrors = false,
  readOnly = false,
}: {
  instructions: string;
  trigger: TriggerFormValues;
  onInstructionsChange: (instructions: string) => void;
  showValidationErrors?: boolean;
  readOnly?: boolean;
}) => {
  const fieldId = useGeneratedHtmlId({ prefix: 'automationInstructions' });
  const [hasBlurred, setHasBlurred] = useState(false);
  const isScheduled = trigger.kind === 'every';
  const label = isScheduled ? labels.instructions : labels.additionalInstructions;
  const error =
    showValidationErrors || hasBlurred || instructions.length > MAX_AUTOMATION_INSTRUCTIONS_LENGTH
      ? getInstructionsError(instructions, trigger)
      : undefined;

  return (
    <EuiFormRow
      id={fieldId}
      fullWidth
      label={label}
      labelAppend={
        <EuiText size="xs" color="subdued">
          {isScheduled ? labels.required : labels.optional}
        </EuiText>
      }
      helpText={labels.limit}
      isInvalid={!readOnly && Boolean(error)}
      error={readOnly ? undefined : error}
    >
      {readOnly ? (
        <EuiText
          size="s"
          color={instructions ? undefined : 'subdued'}
          css={{ whiteSpace: 'pre-wrap' }}
          data-test-subj="automationInstructions"
        >
          {instructions || labels.empty}
        </EuiText>
      ) : (
        <EuiTextArea
          fullWidth
          rows={3}
          resize="vertical"
          maxLength={MAX_AUTOMATION_INSTRUCTIONS_LENGTH}
          aria-required={isScheduled}
          isInvalid={Boolean(error)}
          placeholder={
            isScheduled
              ? labels.schedulePlaceholder
              : trigger.kind === 'alert'
              ? labels.alertPlaceholder
              : labels.slackPlaceholder
          }
          value={instructions}
          onChange={(event) => onInstructionsChange(event.target.value)}
          onBlur={() => setHasBlurred(true)}
          data-test-subj="automationInstructions"
        />
      )}
    </EuiFormRow>
  );
};
