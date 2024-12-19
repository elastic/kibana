/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { css } from '@kbn/kibana-react-plugin/common';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

const verticalSpacing = css`
  ${({ theme: { eui } }) => eui.euiSizeL}
`;

const StyledEuiFlexItemHistoryItem = styled(EuiFlexItem)`
  border-bottom: ${({ theme: { eui } }) => eui.euiBorderWidthThin} dashed
    ${({ theme: { eui } }) => eui.euiBorderColor};
  margin-bottom: ${verticalSpacing};
  padding-bottom: ${verticalSpacing};
`;

export type HistoryItemProps = PropsWithChildren<{}>;

export const HistoryItem = memo<HistoryItemProps>(({ children }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  return (
    <StyledEuiFlexItemHistoryItem grow={true} data-test-subj={getTestId('historyItem')}>
      {children}
    </StyledEuiFlexItemHistoryItem>
  );
});

HistoryItem.displayName = 'HistoryItem';
