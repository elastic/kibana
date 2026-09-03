/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageSectionStackSizes } from '.';
import { getPageSectionStackStyles } from '.';

describe('getPageSectionStackStyles', () => {
  const defaultSizes: PageSectionStackSizes = { l: 'L', xxl: 'XXL' };

  it('stacks the sections vertically', () => {
    expect(getPageSectionStackStyles(defaultSizes).flexDirection).toBe('column');
  });

  it('lays the sections out as a flex container', () => {
    expect(getPageSectionStackStyles(defaultSizes).display).toBe('flex');
  });

  it('separates the sections by the large token', () => {
    expect(getPageSectionStackStyles(defaultSizes).gap).toBe('L');
  });

  it('pads the top and bottom of the stack by the extra extra large token', () => {
    expect(getPageSectionStackStyles(defaultSizes).paddingBlock).toBe('XXL');
  });

  it('interpolates whatever the theme provides, rather than hard-coded lengths', () => {
    expect(getPageSectionStackStyles({ l: '24px', xxl: '40px' })).toEqual({
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      paddingBlock: '40px',
    });
  });
});
