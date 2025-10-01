/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { EuiPanel, useEuiTheme, type CommonProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { GROUPED_ITEM_TEST_ID } from '../../../test_ids';

type CommonPropsWithChildren = CommonProps & PropsWithChildren;

export interface PanelProps extends CommonPropsWithChildren {
  isAlert?: boolean;
}

export const Panel = ({ isAlert, ...restProps }: PanelProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      data-test-subj={GROUPED_ITEM_TEST_ID}
      paddingSize="m"
      hasShadow={false}
      css={css`
        border-radius: ${euiTheme.size.s};
        border: ${euiTheme.border.thin};
        border-color: ${euiTheme.colors.borderBasePlain};
        border-left: ${isAlert ? `7px solid ${euiTheme.colors.danger}` : null};
      `}
      {...restProps}
    />
  );
};
