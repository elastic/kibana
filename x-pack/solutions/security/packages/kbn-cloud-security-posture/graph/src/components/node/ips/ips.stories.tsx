/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { Ips as IpsComponent, useIpPopover, type IpsProps } from './ips';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';

import '@xyflow/react/dist/style.css';

const meta: Meta<IpsProps> = {
  title: 'Components/Graph Components/Additional Components',
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const IpsStoryComponent: React.FC<IpsProps> = () => {
  const singleIp = ['10.200.0.202'];
  const singleIpClickable = ['192.168.1.100'];
  const multipleIps = [
    '10.200.0.202',
    '192.14.29.80',
    '74.25.14.20',
    '172.16.0.1',
    '203.0.113.1',
    '198.51.100.1',
    '192.0.2.1',
  ];

  const multipleIpsPopover = useIpPopover(multipleIps);
  const singleIpPopover = useIpPopover(singleIpClickable);

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      {/* Single IP without click handler - renders as text */}
      <div>
        <EuiText>{'Single IP (non-clickable):'}</EuiText>
        <EuiSpacer size="s" />
        <IpsComponent ips={singleIp} />
      </div>

      <EuiSpacer size="l" />

      {/* Single IP with click handler - opens popover */}
      <div>
        <EuiText>{'Single IP (clickable with popover):'}</EuiText>
        <EuiSpacer size="s" />
        <IpsComponent ips={singleIpClickable} onIpClick={singleIpPopover.onIpClick} />
      </div>

      <EuiSpacer size="l" />

      {/* Multiple IPs with click handler */}
      <div>
        <EuiText>{'Multiple IPs (with popover):'}</EuiText>
        <EuiSpacer size="s" />
        <IpsComponent ips={multipleIps} onIpClick={multipleIpsPopover.onIpClick} />
      </div>

      <singleIpPopover.PopoverComponent />
      <multipleIpsPopover.PopoverComponent />
    </ThemeProvider>
  );
};

export const Ips: StoryObj<IpsProps> = {
  render: (args) => <IpsStoryComponent {...args} />,
};
