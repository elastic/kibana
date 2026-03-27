/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { SCRIPT_LIBRARY_LABELS as filterLabel } from '../../../translations';

export const ClearAllButton = memo(
  ({
    'data-test-subj': dataTestSubj,
    isDisabled,
    onClick,
  }: {
    'data-test-subj'?: string;
    isDisabled: boolean;
    onClick: () => void;
  }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiButtonEmpty
        iconType="cross"
        color="danger"
        data-test-subj={dataTestSubj}
        isDisabled={isDisabled}
        onClick={onClick}
        css={css`
          border-top: ${euiTheme.border.thin};
          border-radius: 0;
        `}
      >
        {filterLabel.filterClearAll}
      </EuiButtonEmpty>
    );
  }
);

ClearAllButton.displayName = 'ClearAllButton';
