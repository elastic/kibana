/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import { EuiText } from '@elastic/eui';
import type { EuiTextProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { TIMESTAMP_TEST_ID } from './test_ids';

export interface DocumentTimestampProps {
  /**
   * Optional content rendered after the formatted date (e.g. a spacer).
   * When omitted nothing is rendered after the date.
   */
  children?: ReactNode;
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Text size passed to EuiText. Defaults to 's'.
   */
  size?: EuiTextProps['size'];
}

/**
 * Renders the document timestamp as a formatted date, or nothing if absent.
 */
export const Timestamp = memo(({ hit, children, size = 's' }: DocumentTimestampProps) => {
  const timestamp = useMemo(() => getFieldValue(hit, TIMESTAMP) as string, [hit]);

  if (!timestamp) return null;

  return (
    <>
      <EuiText size={size}>
        <PreferenceFormattedDate value={new Date(timestamp)} data-test-subj={TIMESTAMP_TEST_ID} />
      </EuiText>
      {children}
    </>
  );
});

Timestamp.displayName = 'Timestamp';
