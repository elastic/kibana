/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { type EuiThemeComputed } from '@elastic/eui';

export const FullHeight = css({
  height: '100%',
});

export const PanelFillContainer = css({
  // This is needed to maintain the resizable container height when rendering output editor with larger content
  height: '90%',
});

export const QueryViewContainer = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    padding: euiTheme.size.l,
    paddingRight: 0,
  });

export const QueryViewSidebarContainer = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    padding: euiTheme.size.l,
    paddingLeft: 0,
  });

export const QueryViewTitlePanel = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    borderBottom: euiTheme.border.thin,
    padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
  });
