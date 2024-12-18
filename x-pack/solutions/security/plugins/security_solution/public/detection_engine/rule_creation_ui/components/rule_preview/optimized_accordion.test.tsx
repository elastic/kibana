/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OptimizedAccordion } from './optimized_accordion';

describe('OptimizedAccordion', () => {
  it('should not render children content if accordion initially closed', () => {
    render(
      <OptimizedAccordion id="test" buttonContent={'accordion button'}>
        <span>{'content'}</span>
      </OptimizedAccordion>
    );

    expect(screen.queryByText('content')).toBeNull();
  });
  it('should render children content if accordion initially opened', () => {
    render(
      <OptimizedAccordion id="test" buttonContent={'accordion button'} forceState="open">
        <span>{'content'}</span>
      </OptimizedAccordion>
    );

    expect(screen.getByText('content')).toBeInTheDocument();
  });
  it('should render children content when accordion opened', async () => {
    render(
      <OptimizedAccordion id="test" buttonContent={'accordion button'}>
        <span>{'content'}</span>
      </OptimizedAccordion>
    );

    const toggleButton = screen.getByText('accordion button');
    await userEvent.click(toggleButton);

    expect(screen.getByText('content')).toBeVisible();
  });
  it('should not destroy children content when accordion closed', async () => {
    render(
      <OptimizedAccordion id="test" buttonContent={'accordion button'}>
        <span>{'content'}</span>
      </OptimizedAccordion>
    );

    const toggleButton = screen.getByText('accordion button');
    await userEvent.click(toggleButton);

    expect(screen.getByText('content')).toBeVisible();

    await userEvent.click(toggleButton);
    expect(screen.getByText('content')).not.toBeVisible();
  });
});
