/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ToolsFlyoutTitle } from './tools_flyout_title';
import { TOOLS_FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';

describe('<ToolsFlyoutTitle />', () => {
  it('renders the label', () => {
    const { getByText, getByTestId } = render(
      <ToolsFlyoutTitle onTitleClick={jest.fn()} label="my-host" iconType="storage" />
    );
    expect(getByTestId(TOOLS_FLYOUT_HEADER_TITLE_TEST_ID)).toHaveTextContent('my-host');
    expect(getByText('my-host')).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
  });

  it('calls onTitleClick when clicked', () => {
    const onTitleClick = jest.fn();
    const { getByTestId } = render(
      <ToolsFlyoutTitle onTitleClick={onTitleClick} label="my-host" iconType="storage" />
    );
    fireEvent.click(getByTestId(TOOLS_FLYOUT_HEADER_TITLE_TEST_ID));
    expect(onTitleClick).toHaveBeenCalledTimes(1);
  });

  it('shows the full label in a tooltip', async () => {
    const { getByTestId } = render(
      <ToolsFlyoutTitle onTitleClick={jest.fn()} label="my-host" iconType="storage" />
    );

    fireEvent.mouseOver(getByTestId(TOOLS_FLYOUT_HEADER_TITLE_TEST_ID));
    await waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('my-host');
    });
  });
});
