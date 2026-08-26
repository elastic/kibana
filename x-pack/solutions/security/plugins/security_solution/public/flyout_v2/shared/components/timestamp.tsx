/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { EuiText, type EuiTextProps } from '@elastic/eui';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { TIMESTAMP_TEST_ID } from './test_ids';

export interface TimestampProps {
  /**
   * The document to read the date from.
   */
  hit: DataTableRecord;
  /**
   * Field name to read from the hit. Defaults to `@timestamp`.
   */
  field?: string;
  /**
   * Optional content rendered after the formatted date (e.g. a spacer).
   * When omitted nothing is rendered after the date.
   */
  children?: ReactNode;
  /**
   * Text size passed to EuiText. Defaults to 's'.
   */
  size?: EuiTextProps['size'];
}

/**
 * Reads a date field from the hit and renders it formatted with the user's
 * locale and timezone preferences. Returns nothing if the field is absent.
 */
export const Timestamp = memo(
  ({ hit, field = TIMESTAMP, children, size = 's' }: TimestampProps) => {
    const date = useMemo(() => getFieldValue(hit, field) as string, [hit, field]);

    if (!date) return null;

    return (
      <>
        <EuiText size={size} data-test-subj={TIMESTAMP_TEST_ID}>
          <PreferenceFormattedDate value={new Date(date)} />
        </EuiText>
        {children}
      </>
    );
  }
);

Timestamp.displayName = 'Timestamp';
