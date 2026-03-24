/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

import * as i18n from './translations';

interface Props {
  successfulGenerations?: number;
}

const LastTimesPopoverComponent: React.FC<Props> = ({ successfulGenerations }) => {
  const isDarkMode = useKibanaIsDarkMode();
  const calculatedBy = successfulGenerations ?? 0;

  return (
    <EuiFlexGroup
      css={css`
        width: 300px;
      `}
      data-test-subj="lastTimesPopover"
      direction="column"
      gutterSize="none"
    >
      <EuiFlexItem grow={false}>
        <EuiText
          color={isDarkMode ? 'subdued' : 'default'}
          data-test-subj="averageTimeIsCalculated"
          size="s"
        >
          {i18n.AVERAGE_TIME_IS_CALCULATED(calculatedBy)}
        </EuiText>
        <EuiSpacer size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

LastTimesPopoverComponent.displayName = 'LastTimesPopoverComponent';

export const LastTimesPopover = React.memo(LastTimesPopoverComponent);
