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

describe('AiGradientBadge', () => {
  it('falls back to ButtonText under forced-colors so the count stays visible on ButtonFace', () => {
    render(
      <EuiProvider>
        <AiGradientBadge testSubj="nightshiftAiGradientBadge">0</AiGradientBadge>
      </EuiProvider>
    );

    const label = screen.getByTestId('nightshiftAiGradientBadgeLabel');
    const labelStyles = styleChunksForClass(label.className);

    expect(labelStyles).toMatch(/forced-colors:\s*active/);
    expect(labelStyles).toMatch(/-webkit-text-fill-color:\s*ButtonText/);
    expect(labelStyles).toMatch(/color:\s*ButtonText/);
  });
});
