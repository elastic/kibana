/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed, UseEuiTheme } from '@elastic/eui';

/** One size for the chart and its loading placeholder, so that loading never moves the page. */
export const getChartBlockSize = ({ base }: EuiThemeComputed): number => base * 11;

export const chartArea = ({ euiTheme }: UseEuiTheme) =>
  css({
    blockSize: getChartBlockSize(euiTheme),
  });
