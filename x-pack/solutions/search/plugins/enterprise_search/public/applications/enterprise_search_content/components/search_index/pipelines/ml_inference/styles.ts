/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { type EuiThemeComputed } from '@elastic/eui';

export const enterpriseSearchInferencePipelineFlyoutStyles = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    '.enterpriseSearchInferencePipelineFlyoutFooter': {
      '.euiButtonEmpty': {
        paddingInline: euiTheme.size.m,
      },
    },

    '.resizableContainer': {
      '.reviewCodeBlock': {
        height: '100%',
      },
      minHeight: `calc(${euiTheme.size.xl} * 10)`,
    },
  });
