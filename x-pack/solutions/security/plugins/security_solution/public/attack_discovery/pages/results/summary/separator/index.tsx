/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface Props {
  marginLeft?: string;
  marginRight?: string;
}

const SeparatorComponent: React.FC<Props> = ({ marginLeft, marginRight }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      css={css`
        color: ${euiTheme.colors.lightShade};
      `}
      size="s"
    >
      <div
        css={css`
          margin-left: ${marginLeft ?? euiTheme.size.s};
          margin-right: ${marginRight ?? euiTheme.size.s};
        `}
      >
        {'|'}
      </div>
    </EuiText>
  );
};

SeparatorComponent.displayName = 'Separator';

export const Separator = React.memo(SeparatorComponent);
