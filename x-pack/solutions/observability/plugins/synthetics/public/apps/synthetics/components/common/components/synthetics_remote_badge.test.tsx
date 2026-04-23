/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SyntheticsRemoteBadge } from './synthetics_remote_badge';

describe('SyntheticsRemoteBadge', () => {
  it('renders nothing when remote is undefined', () => {
    const { container } = render(<SyntheticsRemoteBadge remote={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the remote cluster name as a badge', () => {
    render(<SyntheticsRemoteBadge remote={{ remoteName: 'cluster-west' }} />);
    expect(screen.getByTestId('syntheticsRemoteBadge')).toBeInTheDocument();
    expect(screen.getByText('cluster-west')).toBeInTheDocument();
  });

  it('renders the remote cluster name when kibanaUrl is also provided', () => {
    render(
      <SyntheticsRemoteBadge
        remote={{ remoteName: 'cluster-east', kibanaUrl: 'https://east.kibana.example.com' }}
      />
    );
    expect(screen.getByText('cluster-east')).toBeInTheDocument();
  });
});
