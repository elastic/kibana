/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { TruncatedUrl } from './truncated_url';

describe('TruncatedUrl', () => {
  it('keeps the whole URL in the page, for screen readers and copying', () => {
    render(<TruncatedUrl url="https://cdn.example.net/static/js/app.js" />, {
      wrapper: EuiProvider,
    });

    expect(screen.getByText('https://cdn.example.net/static/js/app.js')).toBeInTheDocument();
  });
});
