/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { TruncatedCode } from './truncated_code';

describe('TruncatedCode', () => {
  it('shows the value in code font, with the value as its title by default', () => {
    render(<TruncatedCode value="/products" />, { wrapper: EuiProvider });

    const code = screen.getByText('/products');
    expect(code.tagName).toBe('CODE');
    expect(code.closest('[title]')).toHaveAttribute('title', '/products');
  });

  it('shows the given title, e.g. the full URL of a shortened value', () => {
    render(<TruncatedCode value="app.js" title="https://shop.example.com/static/app.js" />, {
      wrapper: EuiProvider,
    });

    expect(screen.getByText('app.js').closest('[title]')).toHaveAttribute(
      'title',
      'https://shop.example.com/static/app.js'
    );
  });
});
