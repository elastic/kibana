/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import AttachmentContentChildren from './external_reference_children';

describe('AttachmentContentChildren', () => {
  const defaultProps = {
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
    const props = {
      externalReferenceMetadata: {
        ...defaultProps,
      },
    };
    const { getByText } = render(<AttachmentContentChildren {...props} />);
    expect(getByText('Test comment')).toBeInTheDocument();
  });

  it('does not render when comment is empty', () => {
    const props = {
      externalReferenceMetadata: {
        ...defaultProps,
        comment: '',
      },
    };
    const { container } = render(<AttachmentContentChildren {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when comment is only whitespace', () => {
    const props = {
      externalReferenceMetadata: {
        ...defaultProps,
        comment: '   ',
      },
    };

    const { container } = render(<AttachmentContentChildren {...props} />);
    expect(container.firstChild).toBeNull();
  });
});
