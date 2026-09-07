/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import AttachmentContentChildren from './endpoint_children';

describe('AttachmentContentChildren', () => {
  it('renders markdown content when content exists', () => {
    const { getByText } = render(<AttachmentContentChildren data={{ content: 'Test comment' }} />);
    expect(getByText('Test comment')).toBeInTheDocument();
  });

  it('does not render when content is empty', () => {
    const { container } = render(<AttachmentContentChildren data={{ content: '' }} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when content is only whitespace', () => {
    const { container } = render(<AttachmentContentChildren data={{ content: '   ' }} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when data is undefined', () => {
    const { container } = render(<AttachmentContentChildren data={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
