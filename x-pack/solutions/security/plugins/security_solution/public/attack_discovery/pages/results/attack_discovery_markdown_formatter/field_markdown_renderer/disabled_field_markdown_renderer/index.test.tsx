/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { DisabledFieldMarkdownRenderer } from '.';

describe('DisabledFieldMarkdownRenderer', () => {
  const name = 'host.name';
  const value = '6364495c-9c4a-43ab-add4-1816a4365f53';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the value in a non-interactive badge', () => {
    render(<DisabledFieldMarkdownRenderer icon="storage" name={name} operator=":" value={value} />);

    expect(screen.getByTestId('disabledActionsBadge')).toHaveTextContent(value);
  });

  it('clips long values by default', () => {
    render(<DisabledFieldMarkdownRenderer icon="storage" name={name} operator=":" value={value} />);

    const label = screen.getByTestId('disabledChipLabel');

    expect(label).toHaveStyleRule('max-width', '10rem');
    expect(label).toHaveStyleRule('white-space', 'nowrap');
  });

  it('wraps long values instead of clipping them when wrapFieldValues is true', () => {
    render(
      <DisabledFieldMarkdownRenderer
        icon="storage"
        name={name}
        operator=":"
        value={value}
        wrapFieldValues={true}
      />
    );

    const label = screen.getByTestId('disabledChipLabel');

    expect(label).toHaveStyleRule('overflow-wrap', 'anywhere');
    expect(label).toHaveStyleRule('white-space', 'normal');
    expect(label).not.toHaveStyleRule('max-width', '10rem');
  });

  it('shows the field name in the tooltip when the value fits', async () => {
    render(<DisabledFieldMarkdownRenderer icon="storage" name={name} operator=":" value="srv-1" />);

    fireEvent.mouseOver(screen.getByTestId('disabledActionsBadge'));

    expect(await screen.findByText(name)).toBeInTheDocument();
  });

  it('shows the field name and full value in the tooltip when the value is clipped', async () => {
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    jest.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(250);

    render(<DisabledFieldMarkdownRenderer icon="storage" name={name} operator=":" value={value} />);

    fireEvent.mouseOver(screen.getByTestId('disabledActionsBadge'));

    expect(await screen.findByText(`${name}: ${value}`)).toBeInTheDocument();
  });

  it('shows only the field name in the tooltip when wrapFieldValues is true', async () => {
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    jest.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(250);

    render(
      <DisabledFieldMarkdownRenderer
        icon="storage"
        name={name}
        operator=":"
        value={value}
        wrapFieldValues={true}
      />
    );

    fireEvent.mouseOver(screen.getByTestId('disabledActionsBadge'));

    expect(await screen.findByText(name)).toBeInTheDocument();
    expect(screen.queryByText(`${name}: ${value}`)).not.toBeInTheDocument();
  });
});
