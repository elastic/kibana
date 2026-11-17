/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { buildYaraTheme } from './theme';

describe('buildYaraTheme', () => {
  const {
    result: { current: euiThemeContext },
  } = renderHook(() => useEuiTheme(), { wrapper: EuiProvider });
  const { colors } = euiThemeContext.euiTheme;

  const theme = buildYaraTheme(euiThemeContext);
  const getRule = (token: string) => theme.rules.find((rule) => rule.token === token);

  it('should color string references differently than keywords', () => {
    expect(getRule('variable.yara')).toEqual({
      token: 'variable.yara',
      foreground: colors.textWarning,
    });
    expect(colors.textWarning).not.toEqual(colors.textPrimary);
  });

  it.each(['string.escape.yara', 'regexp.escape.yara'])(
    'should color `%s` differently than strings',
    (token) => {
      expect(getRule(token)).toEqual({ token, foreground: colors.textAccentSecondary });
      expect(colors.textAccentSecondary).not.toEqual(colors.textDanger);
    }
  );

  it.each([
    'invalid.yara',
    'string.invalid.yara',
    'string.escape.invalid.yara',
    'regexp.invalid.yara',
  ])('should underline `%s` in red', (token) => {
    expect(getRule(token)).toEqual({
      token,
      foreground: colors.textDanger,
      fontStyle: 'underline',
    });
  });
});
