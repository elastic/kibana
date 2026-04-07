/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { TIMESTAMP_TEST_ID } from './test_ids';

export interface DocumentTimestampProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

/**
 * Renders the document timestamp as a formatted date, or nothing if absent.
 */
export const Timestamp = memo(({ hit }: DocumentTimestampProps) => {
  const timestamp = useMemo(() => getFieldValue(hit, TIMESTAMP) as string, [hit]);

  if (!timestamp) return null;

  return <PreferenceFormattedDate value={new Date(timestamp)} data-test-subj={TIMESTAMP_TEST_ID} />;
});

Timestamp.displayName = 'Timestamp';
