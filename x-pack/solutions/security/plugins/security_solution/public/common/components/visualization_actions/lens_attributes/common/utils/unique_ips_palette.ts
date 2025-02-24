/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiThemeComputed } from '@elastic/eui';

export const getDestinationIpColor = (euiTheme: EuiThemeComputed) =>
  euiTheme.flags.hasVisColorAdjustment ? '#9170b8' : euiTheme.colors.vis.euiColorVis2;

export const getSourceIpColor = (euiTheme: EuiThemeComputed) =>
  euiTheme.flags.hasVisColorAdjustment ? '#d36186' : euiTheme.colors.vis.euiColorVis4;
