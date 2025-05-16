/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as lightTheme, euiDarkVars as darkTheme } from '@kbn/ui-theme';

import { useDarkMode } from '../kibana';

export const useEuiTheme = () => {
  const darkMode = useDarkMode();
  return darkMode ? darkTheme : lightTheme;
};
