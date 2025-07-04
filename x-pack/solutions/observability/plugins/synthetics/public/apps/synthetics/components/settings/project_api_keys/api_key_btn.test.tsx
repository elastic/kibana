/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { ApiKeyBtn } from './api_key_btn';
import { render } from '../../../utils/testing';

describe('<APIKeyButton />', () => {
  const clickCallback = jest.fn();

  it('calls delete monitor on monitor deletion', async () => {
    render(<ApiKeyBtn apiKey="" loading={false} onClick={clickCallback} />);

    expect(screen.getByText('Generate Project API key')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('uptimeMonitorManagementApiKeyGenerate'));
    expect(clickCallback).toHaveBeenCalled();
  });

  it('shows correct content on loading', () => {
    render(<ApiKeyBtn apiKey="" loading={true} onClick={clickCallback} />);

    expect(screen.getByText('Generating API key')).toBeInTheDocument();
  });

  it('shows api key when available and hides button', () => {
    const apiKey = 'sampleApiKey';
    render(<ApiKeyBtn apiKey={apiKey} loading={false} onClick={clickCallback} />);

    expect(screen.queryByText('Generate Project API key')).not.toBeInTheDocument();
  });
});
