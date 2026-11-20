/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

/** Keeps the last line of the page clear of the embedded Console bar, which overlays the bottom. */
export const searchHomeFooter = ({ euiTheme }: UseEuiTheme) =>
  css({
    marginBlockEnd: euiTheme.size.xxl,
  });
