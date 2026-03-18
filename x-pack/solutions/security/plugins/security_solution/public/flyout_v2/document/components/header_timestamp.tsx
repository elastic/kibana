/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { HEADER_TIMESTAMP_TEST_ID } from './test_ids';

export interface HeaderTimestampProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
}

/**
 * Renders the @timestamp value in the flyout header.
 * Returns null if no timestamp is present.
 */
export const HeaderTimestamp: FC<HeaderTimestampProps> = memo(({ hit }) => {
  const timestamp = getFieldValue(hit, '@timestamp') as string | undefined;

  if (!timestamp) {
    return null;
  }

  return (
    <>
      <EuiText size="xs" color="subdued" data-test-subj={HEADER_TIMESTAMP_TEST_ID}>
        <PreferenceFormattedDate value={new Date(timestamp)} />
      </EuiText>
      <EuiSpacer size="xs" />
    </>
  );
});

HeaderTimestamp.displayName = 'HeaderTimestamp';
