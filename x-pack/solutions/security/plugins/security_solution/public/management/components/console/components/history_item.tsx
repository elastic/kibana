/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export type HistoryItemProps = PropsWithChildren<{}>;

export const HistoryItem = memo<HistoryItemProps>(({ children }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const { euiTheme } = useEuiTheme();
  const historyItemStyles = css`
    border-bottom: ${euiTheme.border.width.thin} dashed ${euiTheme.border.color};
    margin-bottom: ${euiTheme.size.l};
    padding-bottom: ${euiTheme.size.l};
  `;

  return (
    <EuiFlexItem grow={true} css={historyItemStyles} data-test-subj={getTestId('historyItem')}>
      {children}
    </EuiFlexItem>
  );
});

HistoryItem.displayName = 'HistoryItem';
