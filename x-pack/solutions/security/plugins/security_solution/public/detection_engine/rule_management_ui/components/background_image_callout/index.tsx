/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, useEuiTheme, type EuiCallOutProps } from '@elastic/eui';
import { css } from '@emotion/react';

interface BackgroundImageCalloutProps extends EuiCallOutProps {
  backgroundImage: string;
  description: JSX.Element;
}

export function BackgroundImageCallout({
  description,
  backgroundImage,
  ...euiCalloutProps
}: BackgroundImageCalloutProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiCallOut
      css={css`
        padding-left: ${euiTheme.size.xl};
        background-image: url(${backgroundImage});
        background-repeat: no-repeat;
        background-position-x: right;
        background-position-y: bottom;
      `}
      {...euiCalloutProps}
    >
      {description}
    </EuiCallOut>
  );
}
