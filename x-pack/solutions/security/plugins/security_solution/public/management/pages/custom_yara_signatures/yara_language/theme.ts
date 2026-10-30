/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnMonacoLanguageThemeResolver } from '@kbn/code-editor';

const INVALID_TOKENS = ['invalid', 'string.invalid', 'string.escape.invalid', 'regexp.invalid'];

/** builds a theme for the YARA language targeting tokens of concern to us. */
export const buildYaraTheme: KbnMonacoLanguageThemeResolver = (euiThemeContext) => {
  const {
    euiTheme: { colors },
  } = euiThemeContext;

  return {
    rules: [
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
