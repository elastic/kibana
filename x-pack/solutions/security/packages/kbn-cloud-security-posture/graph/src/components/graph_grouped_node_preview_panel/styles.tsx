/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { type CommonProps, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

type CommonPropsWithChildren = CommonProps & PropsWithChildren;

export const PanelBody = (props: CommonPropsWithChildren) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.s} ${euiTheme.size.base};
      `}
      {...props}
    />
  );
};

export const ControlsSection = (props: CommonPropsWithChildren) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.s} 0;
      `}
      {...props}
    />
  );
};

export const List = (props: CommonPropsWithChildren) => {
  const { euiTheme } = useEuiTheme();
  return (
    <ul
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
      `}
      {...props}
    />
  );
};
