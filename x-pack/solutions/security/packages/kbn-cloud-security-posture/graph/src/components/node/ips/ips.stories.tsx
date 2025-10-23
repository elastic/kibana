/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { EuiSpacer } from '@elastic/eui';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { Ips as IpsComponent, useIpPopover } from './ips';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';

import '@xyflow/react/dist/style.css';

const meta: Meta = {
  title: 'Components/Graph Components/Additional Components',
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const IpsStoryComponent: React.FC = () => {
  const singleIp = ['10.200.0.202'];
  const multipleIps = [
    '10.200.0.202',
    '192.14.29.80',
    '74.25.14.20',
    '172.16.0.1',
    '203.0.113.1',
    '198.51.100.1',
    '192.0.2.1',
  ];

  const ipPopover = useIpPopover(multipleIps);

  return (
    <TestProvider>
      <ThemeProvider theme={{ darkMode: false }}>
        <IpsComponent ips={singleIp} />
        <EuiSpacer size="l" />
        <IpsComponent ips={multipleIps} onIpClick={ipPopover.onIpClick} />
        <ipPopover.PopoverComponent />
      </ThemeProvider>
    </TestProvider>
  );
};

export const Ips: StoryObj = {
  render: () => <IpsStoryComponent />,
};
