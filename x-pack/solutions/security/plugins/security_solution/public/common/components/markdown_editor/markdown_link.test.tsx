/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n as render } from '@kbn/test-jest-helpers';
import { MarkdownLink } from './markdown_link';

const mockPrepend = jest.fn((path: string) => `/kbn${path}`);
const mockGet = jest.fn(() => '/kbn');

jest.mock('../../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        basePath: {
          prepend: (path: string) => mockPrepend(path),
          get: () => mockGet(),
        },
      },
    },
  }),
}));

describe('MarkdownLink', () => {
  const defaultProps = { children: 'link text' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prepends the base path to app-internal links', () => {
    const { getByTestId } = render(<MarkdownLink {...defaultProps} href="/app/security/alerts" />);
    expect(getByTestId('markdown-link')).toHaveAttribute('href', '/kbn/app/security/alerts');
  });

  it('leaves absolute external links untouched', () => {
    const { getByTestId } = render(<MarkdownLink {...defaultProps} href="https://elastic.co" />);
    expect(getByTestId('markdown-link')).toHaveAttribute('href', 'https://elastic.co');
  });

  it('leaves protocol-relative links untouched', () => {
    const { getByTestId } = render(<MarkdownLink {...defaultProps} href="//elastic.co/path" />);
    expect(getByTestId('markdown-link')).toHaveAttribute('href', '//elastic.co/path');
  });

  it('does not double-prepend when the base path is already present', () => {
    const { getByTestId } = render(<MarkdownLink {...defaultProps} href="/kbn/app/security" />);
    expect(getByTestId('markdown-link')).toHaveAttribute('href', '/kbn/app/security');
  });

  it('omits the href when links are disabled', () => {
    const { getByTestId } = render(
      <MarkdownLink {...defaultProps} disableLinks href="/app/security/alerts" />
    );
    expect(getByTestId('markdown-link')).not.toHaveAttribute('href');
  });
});
