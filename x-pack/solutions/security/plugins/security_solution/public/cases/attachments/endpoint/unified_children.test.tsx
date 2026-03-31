/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import UnifiedAttachmentChildren from './unified_children';

describe('UnifiedAttachmentChildren', () => {
  const defaultProps = {
    attachmentId: 'action-123',
    savedObjectId: 'so-123',
    caseData: { id: 'case-1', title: 'Test Case' },
    metadata: {
      command: 'isolate',
      comment: 'Test comment',
      targets: [
        {
          endpointId: 'endpoint-1',
          hostname: 'host-1',
          agentType: 'endpoint',
        },
      ],
    },
  };

  it('renders markdown content when comment exists', () => {
    const { getByText } = render(<UnifiedAttachmentChildren {...defaultProps} />);
    expect(getByText('Test comment')).toBeInTheDocument();
  });

  it('does not render when comment is empty', () => {
    const { container } = render(
      <UnifiedAttachmentChildren
        {...defaultProps}
        metadata={{ ...defaultProps.metadata, comment: '' }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when comment is only whitespace', () => {
    const { container } = render(
      <UnifiedAttachmentChildren
        {...defaultProps}
        metadata={{ ...defaultProps.metadata, comment: '   ' }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when metadata has no comment', () => {
    const { container } = render(
      <UnifiedAttachmentChildren {...defaultProps} metadata={{ command: 'isolate', targets: [] }} />
    );
    expect(container.firstChild).toBeNull();
  });
});
