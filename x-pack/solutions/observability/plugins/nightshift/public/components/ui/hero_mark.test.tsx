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
  it('draws the severity-dot ring with a box-shadow using backgroundBasePlain in dark mode', () => {
    let backgroundBasePlain = '';
    let textGhost = '';
    let borderWidthThick = '';

    const Probe = () => {
      const { euiTheme } = useEuiTheme();
      backgroundBasePlain = euiTheme.colors.backgroundBasePlain;
      textGhost = euiTheme.colors.textGhost;
      borderWidthThick = euiTheme.border.width.thick;
      return <HeroMark severity="critical" />;
    };

    render(
      <EuiProvider colorMode="DARK">
        <Probe />
      </EuiProvider>
    );

    const ring = screen.getByTestId('nightshiftHeroMarkSeverityDotRing');
    const ringStyles = styleChunksForClass(ring.className);
    const boxShadowMatch = ringStyles.match(/box-shadow:[^;]+/);

    expect(backgroundBasePlain).not.toBe(textGhost);
    expect(boxShadowMatch?.[0]).toContain(backgroundBasePlain);
    expect(boxShadowMatch?.[0]).toContain(borderWidthThick);
    expect(boxShadowMatch?.[0]).not.toContain(textGhost);
  });
});
