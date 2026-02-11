/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiText, useEuiTheme, formatDate } from '@elastic/eui';
import { GROUPED_ITEM_TIMESTAMP_TEST_ID } from '../../../test_ids';
import type { EntityOrEventItem } from '../types';

export const LIST_ITEM_DATE_FORMAT = 'MM/DD/YYYY, hh:mm:ss A';

export interface TimestampRowProps {
  timestamp: EntityOrEventItem['timestamp'];
}

export const TimestampRow = ({ timestamp }: TimestampRowProps) => {
  const { euiTheme } = useEuiTheme();
  const formattedTimestamp = useMemo(() => {
    if (!timestamp) return undefined;

    return formatDate(timestamp, LIST_ITEM_DATE_FORMAT);
  }, [timestamp]);
  return (
    <EuiText
      data-test-subj={GROUPED_ITEM_TIMESTAMP_TEST_ID}
      size="s"
      color="default"
      css={css`
        font-weight: ${euiTheme.font.weight.medium};
      `}
    >
      {`@ ${formattedTimestamp}`}
    </EuiText>
  );
};
