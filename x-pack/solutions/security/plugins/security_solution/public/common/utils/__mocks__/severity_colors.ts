/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

const mockAmsterdamColors = {
  vis: {
    euiColorVis0: 'euiColorVis0',
    euiColorVis5: 'euiColorVis5',
    euiColorVis7: 'euiColorVis7',
    euiColorVis9: 'euiColorVis9',
  },
};

const mockBorealisColors = {
  vis: {
    euiColorVisSuccess0: 'euiColorVisSuccess0',
    euiColorSeverity7: 'euiColorSeverity7',
    euiColorSeverity10: 'euiColorSeverity10',
    euiColorSeverity14: 'euiColorSeverity14',
  },
};

export const getMockEuiAmsterdamTheme = () =>
  ({
    themeName: 'EUI_THEME_AMSTERDAM',
    colors: mockAmsterdamColors,
  } as EuiThemeComputed);

export const getMockEuiBorealisTheme = () =>
  ({
    themeName: 'EUI_THEME_BOREALIS',
    colors: mockBorealisColors,
  } as EuiThemeComputed);
