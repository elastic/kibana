/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PND_PAGE_CONTENT_MAX_WIDTH,
  PND_PAGE_CONTENT_MAX_WIDTH_WIDE,
  PND_PAGE_WIDE_MIN_WIDTH,
} from '../../constants';
import { getPageColumnStyles } from '.';

describe('getPageColumnStyles', () => {
  it('centers the column in the viewport', () => {
    expect(getPageColumnStyles().marginInline).toBe('auto');
  });

  it('lets the column fill the width its gutter allows', () => {
    expect(getPageColumnStyles().width).toBe('100%');
  });

  it('caps the column at the laptop content width', () => {
    expect(getPageColumnStyles().maxWidth).toBe(PND_PAGE_CONTENT_MAX_WIDTH);
  });

  it('widens the column on wide desktop monitors', () => {
    expect(getPageColumnStyles()[`@media (min-width: ${PND_PAGE_WIDE_MIN_WIDTH}px)`]).toEqual({
      maxWidth: PND_PAGE_CONTENT_MAX_WIDTH_WIDE,
    });
  });

  it('keeps the cap inclusive of padding, so a gutter cannot overflow it', () => {
    expect(getPageColumnStyles().boxSizing).toBe('border-box');
  });
});
