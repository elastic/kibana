/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const CLEAR_ALL_LABEL = i18n.translate('xpack.securitySolution.filter.options.clearAll', {
  defaultMessage: 'Clear all',
});

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
        data-test-subj={dataTestSubj}
        isDisabled={isDisabled}
        onClick={onClick}
        css={css`
          border-top: ${euiTheme.border.thin};
          border-radius: 0 0 ${euiTheme.border.radius.small} ${euiTheme.border.radius.small};
        `}
      >
        {CLEAR_ALL_LABEL}
      </EuiButtonEmpty>
    );
  }
);

ClearAllButton.displayName = 'ClearAllButton';
