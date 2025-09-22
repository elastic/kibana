/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { transparentize, type EuiThemeComputed } from '@elastic/eui';

export const serverlessSearchHeaderSection = css({
  '> div': {
    paddingBottom: 0,
    paddingTop: 0,
  },
});

export const cloudDetailsPanel = css({
  '.serverlessSearchCloudDetailsCopyPanel': {
    wordBreak: 'break-all',
  },
});

export const serverlessSearchOverviewFooterSection = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    backgroundColor: transparentize(euiTheme.colors.primary, 0.9),
  });
