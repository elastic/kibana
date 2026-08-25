/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../../../utils/testing';
import { PROFILES_MAP } from '../../../../../../../common/constants/monitor_defaults';
import { ThrottlingFields } from './throttling_fields';

describe('ThrottlingFields', () => {
  it('renders', async () => {
    render(<ThrottlingFields throttling={PROFILES_MAP.default} setValue={() => {}} />);

    expect(await screen.findByText('Download Speed')).toBeInTheDocument();
    expect(await screen.findByText('Upload Speed')).toBeInTheDocument();
    expect(await screen.findByText('Latency')).toBeInTheDocument();
  });

  it('calls setValue on change', async () => {
    const setValue = jest.fn();
    render(<ThrottlingFields throttling={PROFILES_MAP.default} setValue={setValue} />);

    const throttling = PROFILES_MAP.default;

    const download = await screen.findByTestId('syntheticsBrowserDownloadSpeed');
    fireEvent.change(download, { target: { value: '10' } });
    expect(setValue).toHaveBeenCalledWith({
      ...throttling,
      label: 'Custom',
      id: 'custom',
      value: { download: '10', latency: '20', upload: '3' },
    });

    const upload = await screen.findByTestId('syntheticsBrowserUploadSpeed');
    fireEvent.change(upload, { target: { value: '10' } });
    expect(setValue).toHaveBeenLastCalledWith({
      ...throttling,
      label: 'Custom',
      id: 'custom',
      value: { download: '5', latency: '20', upload: '10' },
    });

    const latency = await screen.findByTestId('syntheticsBrowserLatency');
    fireEvent.change(latency, { target: { value: '10' } });
    expect(setValue).toHaveBeenLastCalledWith({
      ...throttling,
      label: 'Custom',
      id: 'custom',
      value: { download: '5', latency: '10', upload: '3' },
    });
  });

  it('shows maximum bandwidth callout on download and upload change', async () => {
    const setValue = jest.fn();
    const throttling = PROFILES_MAP.default;

    render(
      <ThrottlingFields
        throttling={{
          ...throttling,
          value: {
            ...throttling.value!,
            download: '500',
            upload: '500',
          },
        }}
        setValue={setValue}
      />
    );

    expect(
      await screen.findByText(
        'When using throttling values larger than a Synthetics Node bandwidth limit, your monitor will still have its bandwidth capped.'
      )
    ).toBeInTheDocument();

    expect(
      await screen.findByText(
        "You have exceeded the download limit for Synthetic Nodes. The download value can't be larger than 100Mbps."
      )
    ).toBeInTheDocument();
  });
});
