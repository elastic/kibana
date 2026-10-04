/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiCheckbox, EuiIcon, EuiText } from '@elastic/eui';
import type { ScheduleUnit, TriggerFormValues } from '../../automation_form_values';
import { SelectPill } from '../pills/select_pill';
import { Sentence } from '../pills/sentence';
import { TimeField } from '../pills/time_field';
import { TimezonePicker } from '../pills/timezone_picker';
import { triggerLabels } from '../translations';

const DAYS = [
  { id: '1', label: 'Mon' },
  { id: '2', label: 'Tue' },
  { id: '3', label: 'Wed' },
  { id: '4', label: 'Thu' },
  { id: '5', label: 'Fri' },
  { id: '6', label: 'Sat' },
  { id: '0', label: 'Sun' },
];

export const EveryTriggerEditor = ({
  trigger,
  onChange,
  readOnly = false,
}: {
  trigger: Extract<TriggerFormValues, { kind: 'every' }>;
  onChange: (trigger: TriggerFormValues) => void;
  readOnly?: boolean;
}) => (
  <Sentence>
    <EuiIcon type="calendar" aria-hidden={true} />
    <EuiText size="s">{triggerLabels.everyLead}</EuiText>
    <SelectPill<ScheduleUnit>
      ariaLabel={triggerLabels.scheduleUnit}
      value={trigger.unit}
      options={[
        { value: 'hour', label: triggerLabels.hour },
        { value: 'day', label: triggerLabels.day },
        { value: 'week', label: triggerLabels.week },
      ]}
      onChange={(unit) => onChange({ ...trigger, unit })}
      testSubject="automationScheduleUnit"
      readOnly={readOnly}
    />
    {trigger.unit === 'hour' && (
      <EuiCheckbox
        id="automationBetweenHours"
        label={triggerLabels.betweenHours}
        checked={trigger.betweenHours}
        disabled={readOnly}
        onChange={(event) => onChange({ ...trigger, betweenHours: event.target.checked })}
      />
    )}
    {trigger.unit === 'hour' && trigger.betweenHours && (
      <TimeField
        label={triggerLabels.startTime}
        value={trigger.startTime}
        disabled={readOnly}
        onChange={(startTime) => onChange({ ...trigger, startTime })}
      />
    )}
    {trigger.unit === 'hour' && trigger.betweenHours && (
      <EuiText size="s">{triggerLabels.and}</EuiText>
    )}
    {trigger.unit === 'hour' && trigger.betweenHours && (
      <TimeField
        label={triggerLabels.endTime}
        value={trigger.endTime}
        disabled={readOnly}
        onChange={(endTime) => onChange({ ...trigger, endTime })}
      />
    )}
    {trigger.unit === 'week' && <EuiText size="s">{triggerLabels.on}</EuiText>}
    {trigger.unit === 'week' && (
      <EuiButtonGroup
        legend={triggerLabels.daysOfWeek}
        type="multi"
        buttonSize="compressed"
        options={DAYS}
        idToSelectedMap={Object.fromEntries(trigger.daysOfWeek.map((day) => [String(day), true]))}
        isDisabled={readOnly}
        onChange={(id) => {
          const day = Number(id);
          onChange({
            ...trigger,
            daysOfWeek: trigger.daysOfWeek.includes(day)
              ? trigger.daysOfWeek.filter((selected) => selected !== day)
              : [...trigger.daysOfWeek, day],
          });
        }}
      />
    )}
    {trigger.unit !== 'hour' && <EuiText size="s">{triggerLabels.at}</EuiText>}
    {trigger.unit !== 'hour' && (
      <TimeField
        label={triggerLabels.time}
        value={trigger.time}
        disabled={readOnly}
        onChange={(time) => onChange({ ...trigger, time })}
      />
    )}
    {(trigger.unit !== 'hour' || trigger.betweenHours) && (
      <TimezonePicker
        timezone={trigger.timezone}
        readOnly={readOnly}
        onChange={(timezone) => onChange({ ...trigger, timezone })}
      />
    )}
  </Sentence>
);
