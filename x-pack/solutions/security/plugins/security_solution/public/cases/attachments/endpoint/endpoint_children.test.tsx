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
  const defaultMetadata = {
    command: 'isolate',
    comment: 'Test comment',
    targets: [
      {
        endpointId: 'endpoint-1',
        hostname: 'host-1',
        agentType: 'endpoint' as const,
      },
    ],
  };

  it('renders markdown content when comment exists', () => {
    const { getByText } = render(<AttachmentContentChildren metadata={defaultMetadata} />);
    expect(getByText('Test comment')).toBeInTheDocument();
  });

  it('does not render when comment is empty', () => {
    const { container } = render(
      <AttachmentContentChildren metadata={{ ...defaultMetadata, comment: '' }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when comment is only whitespace', () => {
    const { container } = render(
      <AttachmentContentChildren metadata={{ ...defaultMetadata, comment: '   ' }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
