/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { kibanaService } from '../../../../../utils/kibana_service';
import { SyntheticsRemoteBadge } from './synthetics_remote_badge';

describe('SyntheticsRemoteBadge', () => {
  afterEach(() => {
    kibanaService.isServerless = false;
  });

  it('renders nothing when remote is undefined', () => {
    const { container } = render(<SyntheticsRemoteBadge remote={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a "Remote" badge when remote is provided', () => {
    render(<SyntheticsRemoteBadge remote={{ remoteName: 'cluster-west' }} />);
    expect(screen.getByTestId('syntheticsRemoteBadge')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('renders a "Linked" badge on serverless', () => {
    kibanaService.isServerless = true;
    render(<SyntheticsRemoteBadge remote={{ remoteName: 'keep-serverless-qa-oblt-dc9711' }} />);
    expect(screen.getByText('Linked')).toBeInTheDocument();
  });

  it('renders the badge with kibanaUrl provided', () => {
    render(
      <SyntheticsRemoteBadge
        remote={{ remoteName: 'cluster-east', kibanaUrl: 'https://east.kibana.example.com' }}
      />
    );
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });
});
