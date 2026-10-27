/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { getMaybeDate } from '../../../common/components/formatted_date/maybe_date';
import { TIMELINE_TIMESTAMP_FORMAT } from './constants';

export interface TimelineTimestampProps {
  value: string;
  /**
   * Set false where the timestamp sits inside another control, such as an accordion
   * button: the tooltip anchor is focusable and a button cannot contain one.
   */
  showRawOnHover?: boolean;
  'data-test-subj'?: string;
}

/**
 * Timestamp in the user's time zone at second precision, with the raw value from the
 * Worker on hover. Falls back to the raw value when it does not parse as a date.
 */
export const TimelineTimestamp = ({
  value,
  showRawOnHover = true,
  'data-test-subj': dataTestSubj,
}: TimelineTimestampProps) => {
  const maybeDate = getMaybeDate(value);
  if (!maybeDate.isValid()) {
    return <span data-test-subj={dataTestSubj}>{value}</span>;
  }

  const formatted = (
    <PreferenceFormattedDate value={maybeDate.toDate()} dateFormat={TIMELINE_TIMESTAMP_FORMAT} />
  );

  if (!showRawOnHover) {
    return <span data-test-subj={dataTestSubj}>{formatted}</span>;
  }

  return (
    <EuiToolTip content={value} position="top">
      <span tabIndex={0} data-test-subj={dataTestSubj}>
        {formatted}
      </span>
    </EuiToolTip>
  );
};
