/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider, useEuiTheme } from '@elastic/eui';
import { HeroMark } from './hero_mark';

function styleChunksForClass(className: string): string {
  const classes = className.split(/\s+/).filter(Boolean);
  return Array.from(document.querySelectorAll('style'))
    .map((node) => node.textContent ?? '')
    .join('\n')
    .split('}')
    .filter((chunk) => classes.some((cls) => chunk.includes(`.${cls}`)))
    .join('}');
}

describe('HeroMark', () => {
  it('uses the page surface for the severity-dot ring in dark mode, not textGhost', () => {
    let backgroundBasePlain = '';
    let textGhost = '';

    const Probe = () => {
      const { euiTheme } = useEuiTheme();
      backgroundBasePlain = euiTheme.colors.backgroundBasePlain;
      textGhost = euiTheme.colors.textGhost;
      return <HeroMark severity="critical" />;
    };

    render(
      <EuiProvider colorMode="DARK">
        <Probe />
      </EuiProvider>
    );

    const ring = screen.getByTestId('nightshiftHeroMarkSeverityDot').firstElementChild;
    expect(ring).toBeInstanceOf(HTMLElement);
    const ringStyles = styleChunksForClass((ring as HTMLElement).className);

    expect(backgroundBasePlain).not.toBe(textGhost);
    expect(ringStyles).toContain(backgroundBasePlain);
    expect(ringStyles).not.toContain(textGhost);
  });
});
