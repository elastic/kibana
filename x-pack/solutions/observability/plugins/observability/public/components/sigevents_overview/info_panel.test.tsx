/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { InfoPanel } from './info_panel';

describe('InfoPanel', () => {
  it('renders with the correct title', () => {
    render(
      <InfoPanel title="Summary">
        <p>Content</p>
      </InfoPanel>
    );
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <InfoPanel title="Details">
        <p>This is the panel content</p>
      </InfoPanel>
    );
    expect(screen.getByText('This is the panel content')).toBeInTheDocument();
  });

  it('renders header right content when provided', () => {
    render(
      <InfoPanel title="Details" headerRightContent={<button>Action</button>}>
        <p>Content</p>
      </InfoPanel>
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('does not render header right content when not provided', () => {
    render(
      <InfoPanel title="Details">
        <p>Content</p>
      </InfoPanel>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = render(
      <InfoPanel title="Test">
        <p>Content</p>
      </InfoPanel>
    );
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewInfoPanel"]')
    ).toBeInTheDocument();
  });
});
