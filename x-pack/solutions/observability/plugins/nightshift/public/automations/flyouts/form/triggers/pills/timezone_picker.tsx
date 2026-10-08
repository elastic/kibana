/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SelectPill } from './select_pill';
import { TIMEZONE_OPTIONS } from '../timezones';
import { triggerLabels } from '../translations';

export const TimezonePicker = ({
  timezone,
  onChange,
}: {
  timezone: string;
  onChange: (timezone: string) => void;
}) => (
  <SelectPill
    ariaLabel={triggerLabels.timezone}
    value={timezone}
    options={TIMEZONE_OPTIONS}
    onChange={onChange}
    searchPlaceholder={triggerLabels.timezonePlaceholder}
    testSubject="automationTimezone"
  />
);
