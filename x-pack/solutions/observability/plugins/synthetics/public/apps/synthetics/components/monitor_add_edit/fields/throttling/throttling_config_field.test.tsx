/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { PROFILE_OPTIONS, ThrottlingConfigField } from './throttling_config_field';
import { render } from '../../../../utils/testing';
import { PROFILES_MAP } from '../../../../../../../common/constants/monitor_defaults';

describe('ThrottlingConfigField', () => {
  it('renders', async () => {
    render(
      <ThrottlingConfigField
        ariaLabel={'ariaLabel'}
        initialValue={PROFILES_MAP.default}
        value={PROFILES_MAP.default}
        id={'id'}
        options={PROFILE_OPTIONS}
        onChange={() => {}}
      />
    );
    expect(await screen.findByText('(5 Mbps, 3 Mbps, 20 ms)')).toBeInTheDocument();
  });

  it('selects custom values', async () => {
    const onChange = jest.fn();
    render(
      <ThrottlingConfigField
        ariaLabel={'ariaLabel'}
        initialValue={PROFILES_MAP.default}
        value={PROFILES_MAP.default}
        id={'id'}
        options={PROFILE_OPTIONS}
        onChange={onChange}
      />
    );
    expect(await screen.findByText('(5 Mbps, 3 Mbps, 20 ms)')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('syntheticsThrottlingSelect'));
    fireEvent.click(await screen.findByTestId('syntheticsThrottlingSelectCustom'));

    const customValue = {
      id: 'custom',
      label: 'Custom',
      value: { download: '5', latency: '20', upload: '3' },
    };

    expect(onChange).toHaveBeenCalledWith(customValue);
  });

  it('changes custom values', async () => {
    const onChange = jest.fn();
    const customValue = {
      id: 'custom',
      label: 'Custom',
      value: { download: '5', latency: '20', upload: '3' },
    };

    render(
      <ThrottlingConfigField
        ariaLabel={'ariaLabel'}
        initialValue={customValue}
        value={customValue}
        id={'id'}
        options={PROFILE_OPTIONS}
        onChange={onChange}
      />
    );

    fireEvent.input(screen.getByTestId('syntheticsBrowserUploadSpeed'), {
      target: { value: '10' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...customValue,
      value: { ...customValue.value, upload: '10' },
    });
  });
});
