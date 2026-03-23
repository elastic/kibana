/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

/**
 *
 * Provides the styles for the "Translation complete" badge used when a migration is complete
 * */
export const useCompleteBadgeStyles = () => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaIsDarkMode();
  return css`
    background-color: ${isDarkMode
      ? euiTheme.colors.success
      : euiTheme.colors.backgroundBaseSuccess};
    color: ${isDarkMode ? euiTheme.colors.plainDark : euiTheme.colors.textSuccess};
    text-decoration: none;
  `;
};
