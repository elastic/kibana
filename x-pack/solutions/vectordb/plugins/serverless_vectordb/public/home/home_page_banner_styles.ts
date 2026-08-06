/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';

export const bannerCallOutStyle = ({ euiTheme }: UseEuiTheme) => ({
  backgroundColor: euiTheme.colors.backgroundBasePlain,
  border: euiTheme.border.thin,
  borderRadius: euiTheme.border.radius.medium,
});

export const bannerButtonFlexItemStyle = ({ euiTheme }: UseEuiTheme) => ({
  marginRight: euiTheme.size.l,
});
