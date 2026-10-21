/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFieldText, EuiFormRow, EuiText } from '@elastic/eui';
import {
  MAX_CRON_EXPRESSION_LENGTH,
  parseCronExpression,
} from '@kbn/nightshift-investigations-plugin/common';
import type { TriggerFormValues } from '../../automation_form_values';
import { isTriggerValid } from '../../validation';
import { Sentence, SentenceIcon } from '../pills/sentence';
import { TimezonePicker } from '../pills/timezone_picker';
import { triggerLabels } from '../translations';

export const CronTriggerEditor = ({
  trigger,
  onChange,
  readOnly = false,
}: {
  trigger: Extract<TriggerFormValues, { kind: 'cron' }>;
  onChange: (trigger: TriggerFormValues) => void;
  readOnly?: boolean;
}) => {
  const cron = parseCronExpression(trigger.cronExpression);
  const error = !cron.success
    ? cron.error
    : !isTriggerValid(trigger)
    ? triggerLabels.invalidTimezone
    : undefined;
  return (
    <EuiFormRow
      fullWidth
      isInvalid={Boolean(error)}
      error={error}
      helpText={triggerLabels.cronHelp}
    >
      <Sentence>
        <SentenceIcon type="calendar" />
        <EuiText size="s">{triggerLabels.customCron}</EuiText>
        {readOnly ? (
          <EuiBadge data-test-subj="automationCronExpression">{trigger.cronExpression}</EuiBadge>
        ) : (
          <EuiFieldText
            compressed
            aria-label={triggerLabels.customCron}
            placeholder="0 9 * * *"
            maxLength={MAX_CRON_EXPRESSION_LENGTH}
            isInvalid={Boolean(error)}
            value={trigger.cronExpression}
            onChange={(event) => onChange({ ...trigger, cronExpression: event.target.value })}
            data-test-subj="automationCronExpression"
          />
        )}
        <TimezonePicker
          timezone={trigger.timezone}
          readOnly={readOnly}
          onChange={(timezone) => onChange({ ...trigger, timezone })}
        />
      </Sentence>
    </EuiFormRow>
  );
};
