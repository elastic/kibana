/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { WorkerWarningIcon } from './worker_warning_icon';

const WORKER_ID = 'worker-a';

const renderIcon = (messages: string[]) =>
  render(
    <WorkerWarningIcon
      workerId={WORKER_ID}
      workerName="Worker A"
      reasons={messages.map((message, index) => ({ id: `reason-${index}`, message }))}
    />
  );

const openTooltip = async () => {
  fireEvent.mouseOver(screen.getByTestId(`alertZeroWorkerWarningIcon-${WORKER_ID}`));
  return screen.findByRole('tooltip');
};

describe('WorkerWarningIcon', () => {
  it('renders nothing without a reason', () => {
    const { container } = renderIcon([]);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a single reason as a sentence', async () => {
    renderIcon(['Hunt is disabled.']);
    const icon = screen.getByTestId(`alertZeroWorkerWarningIcon-${WORKER_ID}`);

    // The EUI icon mock renders its accessible label as text.
    expect(icon).toHaveTextContent('Warnings for Worker A');
    const tooltip = await openTooltip();
    expect(tooltip).toHaveTextContent('Hunt is disabled.');
    expect(within(tooltip).queryByRole('list')).not.toBeInTheDocument();
  });

  it('stacks several reasons as a list in order', async () => {
    renderIcon(['First reason.', 'Second reason.']);

    const tooltip = await openTooltip();
    const items = within(tooltip).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['First reason.', 'Second reason.']);
  });
});
