/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { renderHook } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import React from 'react';
import { useThroughlineTokens } from './use_throughline_tokens';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiProvider colorMode="LIGHT">{children}</EuiProvider>
);

describe('Throughline design tokens', () => {
  it('maps thread types to theme-derived colors (not raw hex)', () => {
    const { result } = renderHook(() => useThroughlineTokens(), { wrapper });
    const { threadTypeColor, euiTheme } = result.current;

    expect(threadTypeColor('case')).toBe(euiTheme.colors.primary);
    expect(threadTypeColor('investigation')).toBe(euiTheme.colors.accentSecondary);
    expect(threadTypeColor('tuning')).toBe(euiTheme.colors.accentSecondary);
    expect(threadTypeColor('hunt')).toBe(euiTheme.colors.accent);
    expect(threadTypeColor('incident')).toBe(euiTheme.colors.danger);
    expect(threadTypeColor('detection')).toBe(euiTheme.colors.danger);
    expect(threadTypeColor('chat')).toBe(euiTheme.colors.subduedText);
  });

  it('maps decision states to theme-derived colors + labels', () => {
    const { result } = renderHook(() => useThroughlineTokens(), { wrapper });
    const { decisionStateColor, decisionStateLabel, euiTheme } = result.current;

    expect(decisionStateColor('waiting')).toBe(euiTheme.colors.warning);
    expect(decisionStateColor('in_motion')).toBe(euiTheme.colors.primary);
    expect(decisionStateColor('deferred')).toBe(euiTheme.colors.subduedText);
    expect(decisionStateColor('decided')).toBe(euiTheme.colors.success);

    expect(decisionStateLabel.waiting).toBe('Waiting');
    expect(decisionStateLabel.in_motion).toBe('In motion');
    expect(decisionStateLabel.decided).toBe('Decided');
  });

  // Regression guard: the token module must resolve everything through euiTheme.
  // A raw hex literal here would mean we forked the palette instead of mapping it,
  // reintroducing the light/dark drift the Throughline→EUI alignment set out to remove.
  it('contains no inline hex color literals (no CSS fork)', () => {
    const source = fs.readFileSync(path.join(__dirname, 'throughline_tokens.ts'), 'utf8');
    const hexMatches = source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexMatches).toEqual([]);
  });
});
