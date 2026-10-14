/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiText } from '@elastic/eui';
import type { TriggerFormValues } from '../../automation_form_values';
import { validationLabels } from '../../validation';

export const UnsupportedSchedule = ({
  trigger,
}: {
  trigger: Extract<TriggerFormValues, { kind: 'cron' }>;
}) => (
  <>
    <EuiBadge data-test-subj="automationCronExpression">{trigger.cronExpression}</EuiBadge>
    <EuiBadge>{trigger.timezone}</EuiBadge>
    <EuiText size="xs" color="warning" data-test-subj="automationUnsupportedSchedule">
      {validationLabels.unsupportedSchedule}
    </EuiText>
  </>
);
