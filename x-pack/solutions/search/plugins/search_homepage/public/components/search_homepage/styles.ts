/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const homepageNavLinkHeaderStyle = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    padding: `${euiTheme.size.xs} 0`,
  });

export const homepageNavLinkHeaderIconStyle = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    backgroundColor: `${euiTheme.colors.backgroundBaseSubdued}`,
    padding: euiTheme.size.s,
    borderRadius: euiTheme.border.radius.small,
  });

export const promoBannerContainerStyle = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    padding: euiTheme.size.base,
    border: euiTheme.border.thin,
    backgroundColor: euiTheme.colors.backgroundBasePlain,
  });
