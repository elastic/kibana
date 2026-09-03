/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageGutterSizes } from '.';
import { getPageGutterStyles } from '.';

describe('getPageGutterStyles', () => {
  const defaultSizes: PageGutterSizes = { m: 'M' };

  it('insets the page by the medium token', () => {
    expect(getPageGutterStyles(defaultSizes).paddingInline).toBe('M');
  });

  it('interpolates whatever the theme provides, rather than a hard-coded length', () => {
    expect(getPageGutterStyles({ m: '12px' }).paddingInline).toBe('12px');
  });

  it('spans the full width, so the column inside it stays centered', () => {
    expect(getPageGutterStyles(defaultSizes).width).toBe('100%');
  });

  it('counts the inset inside the width, so the gutter cannot overflow', () => {
    expect(getPageGutterStyles(defaultSizes).boxSizing).toBe('border-box');
  });
});
