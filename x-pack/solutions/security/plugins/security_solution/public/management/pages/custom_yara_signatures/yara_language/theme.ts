/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { CODE_EDITOR_DEFAULT_THEME_ID, defaultThemesResolvers } from '@kbn/code-editor';
import type { monaco } from '@kbn/code-editor';

const INVALID_TOKENS = ['invalid', 'string.invalid', 'string.escape.invalid', 'regexp.invalid'];

/** Extends the default code editor theme with colors for YARA specific tokens. */
export const buildYaraTheme = (
  euiThemeContext: UseEuiTheme
): monaco.editor.IStandaloneThemeData => {
  const {
    euiTheme: { colors },
  } = euiThemeContext;
  const baseTheme = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID](euiThemeContext);

  return {
    ...baseTheme,
    rules: [
      ...baseTheme.rules,
      { token: 'variable.yara', foreground: colors.textWarning },
      { token: 'string.escape.yara', foreground: colors.textAccentSecondary },
      { token: 'regexp.escape.yara', foreground: colors.textAccentSecondary },
      // Strings are already red, so the underline is what makes invalid parts stand out in them.
      ...INVALID_TOKENS.map((token) => ({
        token: `${token}.yara`,
        foreground: colors.textDanger,
        fontStyle: 'underline',
      })),
    ],
  };
};
