/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { ClosablePopoverTitle } from './closable_popover_title';

describe('closable popover title', () => {
  it('renders with defined options', () => {
    const onClose = jest.fn();
    const children = <div role="code">hello_world()</div>;
    const { getByRole } = render(
      <ClosablePopoverTitle onClose={onClose}>{children}</ClosablePopoverTitle>
    );
    const child = getByRole('code');
    expect(child).toBeInTheDocument();
    expect(child.textContent).toBe('hello_world()');
  });

  it('onClose function gets called', async () => {
    const onClose = jest.fn();
    const children = <div className="foo" />;
    const { getByRole } = render(
      <ClosablePopoverTitle onClose={onClose}>{children}</ClosablePopoverTitle>
    );

    const closeButton = getByRole('button');

    closeButton.click();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
