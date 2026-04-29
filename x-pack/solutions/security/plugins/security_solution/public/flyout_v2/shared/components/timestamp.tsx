/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { TIMESTAMP_TEST_ID } from './test_ids';

export interface TimestampProps {
  /**
   * The date string to format and display. When empty, nothing is rendered.
   */
  date?: string;
}

/**
 * Renders a date string formatted with the user's locale and timezone preferences.
 */
export const Timestamp = memo(({ date }: TimestampProps) => {
  if (!date) return null;

  return (
    <span data-test-subj={TIMESTAMP_TEST_ID}>
      <PreferenceFormattedDate value={new Date(date)} />
    </span>
  );
});

Timestamp.displayName = 'Timestamp';
