/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';

export const LogoContainerStyle = ({ euiTheme }: UseEuiTheme) => ({
  borderRadius: euiTheme.border.radius.medium,
  padding: euiTheme.size.base,
  backgroundColor: euiTheme.colors.backgroundBaseSubdued,
  width: `${euiTheme.base * 6}px`,
  height: `${euiTheme.base * 6}px`,
  justifyContent: 'center',
  alignItems: 'center',
});
