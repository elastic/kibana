/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { AiGradientBadge } from './investigation_status_badge';

function styleChunksForClass(className: string): string {
  const classes = className.split(/\s+/).filter(Boolean);
  return Array.from(document.querySelectorAll('style'))
    .map((node) => node.textContent ?? '')
    .join('\n')
    .split('}')
    .filter((chunk) => classes.some((cls) => chunk.includes(`.${cls}`)))
    .join('}');
}

/** Emotion may emit the media query before or after the selector; take the active-mode block. */
function forcedColorsBlock(styles: string): string {
  const match = styles.match(/@media\s*\(forced-colors:\s*active\)[^{]*\{([\s\S]*?)(?:\}|$)/);
  expect(match?.[1]).toBeDefined();
  return match![1];
}

describe('AiGradientBadge', () => {
  it('uses ButtonText inside forced-colors when on a button surface', () => {
    render(
      <EuiProvider>
        <AiGradientBadge forcedColorsForeground="button">0</AiGradientBadge>
      </EuiProvider>
    );

    const label = screen.getByTestId('nightshiftAiGradientBadgeLabel');
    const block = forcedColorsBlock(styleChunksForClass(label.className));

    expect(block).toMatch(/(?:^|[^-])color:\s*ButtonText\s*!important/);
    expect(block).toMatch(/-webkit-text-fill-color:\s*ButtonText\s*!important/);
  });

  it('uses CanvasText inside forced-colors by default (page surface)', () => {
    render(
      <EuiProvider>
        <AiGradientBadge>Investigated</AiGradientBadge>
      </EuiProvider>
    );

    const label = screen.getByTestId('nightshiftAiGradientBadgeLabel');
    const block = forcedColorsBlock(styleChunksForClass(label.className));

    expect(block).toMatch(/(?:^|[^-])color:\s*CanvasText\s*!important/);
    expect(block).toMatch(/-webkit-text-fill-color:\s*CanvasText\s*!important/);
  });
});
