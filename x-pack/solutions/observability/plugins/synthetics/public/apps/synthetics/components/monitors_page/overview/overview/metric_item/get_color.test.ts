/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColor } from './get_color';
import { EuiThemeComputed } from '@elastic/eui';

describe('getColor', () => {
  const euiTheme: EuiThemeComputed = {
    colors: {
      backgroundBaseDisabled: '#f5f5f5',
      backgroundBaseDanger: '#ff0000',
      backgroundBaseSuccess: '#00ff00',
      backgroundBasePlain: '#ffffff',
      vis: {
        euiColorVisBehindText0: '#00ff00',
        euiColorVisBehindText9: '#ff0000',
      },
    },
    flags: {
      hasVisColorAdjustment: false,
    },
  } as EuiThemeComputed;

  it('should return backgroundBaseDisabled when isEnabled is false', () => {
    const color = getColor(euiTheme, false);
    expect(color).toBe('#f5f5f5');
  });

  it('should return backgroundBaseDanger when status is down', () => {
    const color = getColor(euiTheme, true, 'down');
    expect(color).toBe('#ff0000');
  });

  it('should return backgroundBaseSuccess when status is up', () => {
    const color = getColor(euiTheme, true, 'up');
    expect(color).toBe('#00ff00');
  });

  it('should return backgroundBasePlain when status is unknown', () => {
    const color = getColor(euiTheme, true, 'unknown');
    expect(color).toBe('#ffffff');
  });

  it('should return backgroundBaseSuccess by default when status is not provided', () => {
    const color = getColor(euiTheme, true);
    expect(color).toBe('#00ff00');
  });

  it('should return vis color when isAmsterdam is true and status is down', () => {
    euiTheme.flags.hasVisColorAdjustment = true;
    const color = getColor(euiTheme, true, 'down');
    expect(color).toBe('#ff0000');
  });

  it('should return vis color when isAmsterdam is true and status is up', () => {
    euiTheme.flags.hasVisColorAdjustment = true;
    const color = getColor(euiTheme, true, 'up');
    expect(color).toBe('#00ff00');
  });
});
