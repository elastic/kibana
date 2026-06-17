/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TimestampOverrideReadOnly } from './timestamp_override';

export default {
  component: TimestampOverrideReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/timestamp_override',
};

export const Default = () => (
  <TimestampOverrideReadOnly
    timestampOverride={{
      field_name: 'event.ingested',
      fallback_disabled: true,
    }}
  />
);

export const EmptyStringValue = () => (
  <TimestampOverrideReadOnly timestampOverride={{ field_name: '', fallback_disabled: true }} />
);

export const NoValue = () => <TimestampOverrideReadOnly />;
