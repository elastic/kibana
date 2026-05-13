/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const TrialBadgeContainerStyle = ({ euiTheme }: UseEuiTheme) =>
  css({
    paddingInline: euiTheme.size.xs,
    paddingBlock: euiTheme.size.xxs,
    borderRadius: euiTheme.size.base,
    backgroundColor: euiTheme.colors.backgroundBasePrimary,
    border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePrimary}`,
  });
