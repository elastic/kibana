/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import * as i18n from '../translations';

interface Props {
  reason?: string;
}

const NoDataComponent: React.FC<Props> = ({ reason }) => (
  <EuiFlexGroup direction="column" gutterSize="xs">
    <EuiFlexItem>
      <EuiText
        color="subdued"
        data-test-subj="noDataLabel"
        size="xs"
        css={css`
          text-align: center;
        `}
      >
        {i18n.NO_DATA_LABEL}
      </EuiText>
    </EuiFlexItem>

    {reason != null && (
      <EuiFlexItem
        css={css`
          text-align: center;
        `}
      >
        <EuiSpacer size="s" />
        <EuiText color="subdued" data-test-subj="reasonLabel" size="xs">
          {reason}
        </EuiText>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

NoDataComponent.displayName = 'NoDataComponent';

export const NoData = React.memo(NoDataComponent);
