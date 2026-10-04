/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import cronstrue from 'cronstrue';
import type { TriggerFormValues } from '../../automation_form_values';
import { Sentence } from '../pills/sentence';
import { TimezonePicker } from '../pills/timezone_picker';
import { triggerLabels } from '../translations';
import { isValidCron, validationLabels } from '../../validation';

const describeCron = (expression: string): string =>
  cronstrue.toString(expression, { use24HourTimeFormat: false, verbose: false });

export const CronTriggerEditor = ({
  trigger,
  onChange,
  readOnly = false,
}: {
  trigger: Extract<TriggerFormValues, { kind: 'cron' }>;
  onChange: (trigger: TriggerFormValues) => void;
  readOnly?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const isInvalid = !isValidCron(trigger.cronExpression);
  return (
    <>
      <Sentence>
        <EuiIcon type="calendar" aria-hidden={true} />
        <EuiText size="s">{triggerLabels.customCronLead}</EuiText>
        <EuiFieldText
          compressed
          aria-label={triggerLabels.customCronLead}
          placeholder="0 9 * * *"
          isInvalid={isInvalid}
          value={trigger.cronExpression}
          disabled={readOnly}
          onChange={(event) => onChange({ ...trigger, cronExpression: event.target.value })}
          data-test-subj="automationCronExpression"
        />
        <TimezonePicker
          timezone={trigger.timezone}
          readOnly={readOnly}
          onChange={(timezone) => onChange({ ...trigger, timezone })}
        />
      </Sentence>
      <EuiText
        size="xs"
        color={isInvalid ? 'danger' : 'subdued'}
        css={{ paddingInlineStart: euiTheme.size.l, marginBlockStart: euiTheme.size.xs }}
        data-test-subj="automationCronDescription"
      >
        {isInvalid
          ? validationLabels.cronError
          : `${describeCron(trigger.cronExpression)} (${trigger.timezone})`}
      </EuiText>
    </>
  );
};
