/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetadataIconCard } from './metadata_icon_card';

describe('MetadataIconCard', () => {
  it('renders title and value', () => {
    render(<MetadataIconCard title="Healthy entities" value="24" />);
    expect(screen.getByText('Healthy entities')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('renders with icon when hideIcon is false', () => {
    const { container } = render(
      <MetadataIconCard title="Status" value="Active" iconType="alert" hideIcon={false} />
    );
    expect(container.querySelector('[data-euiicon-type="alert"]')).toBeInTheDocument();
  });

  it('renders without icon when hideIcon is true', () => {
    const { container } = render(
      <MetadataIconCard title="Status" value="Active" iconType="alert" hideIcon={true} />
    );
    expect(container.querySelector('[data-euiicon-type="alert"]')).not.toBeInTheDocument();
  });

  it('renders React node values', () => {
    render(
      <MetadataIconCard
        title="Severity"
        value={<span data-test-subj="custom-value">Critical</span>}
        hideIcon={true}
      />
    );
    expect(screen.getByTestId('custom-value')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('uses default icon type when not provided', () => {
    const { container } = render(
      <MetadataIconCard title="Default" value="Test" hideIcon={false} />
    );
    expect(container.querySelector('[data-euiicon-type="alert"]')).toBeInTheDocument();
  });

  it('has the correct test subject', () => {
    const { container } = render(<MetadataIconCard title="Test" value="Value" />);
    expect(
      container.querySelector('[data-test-subj="sigeventsOverviewMetadataIconCard"]')
    ).toBeInTheDocument();
  });
});
