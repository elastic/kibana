/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { Ips as IpsComponent, useIpPopover, type IpsProps } from './ips';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';

import '@xyflow/react/dist/style.css';

const meta: Meta<IpsProps> = {
  title: 'Components/Graph Components/Additional Components',
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const IpsWithPopoverComponent: React.FC<IpsProps> = (props) => {
  const ipPopover = useIpPopover(props.ips);

  return (
    <>
      <IpsComponent {...props} onIpClick={ipPopover.onIpClick} />
      <ipPopover.PopoverComponent />
    </>
  );
};

const SimpleTemplate: StoryFn<IpsProps> = (props: IpsProps) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <IpsComponent {...props} />
  </ThemeProvider>
);

const PopoverTemplate: StoryFn<IpsProps> = (props: IpsProps) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <IpsWithPopoverComponent {...props} />
  </ThemeProvider>
);

export const Ips: StoryObj<IpsProps> = {
  render: SimpleTemplate,
  args: {
    ips: [
      '10.200.0.202',
      '192.14.29.80',
      '192.14.29.80',
      '74.25.14.20',
      '192.14.29.80',
      '10.200.0.202',
    ],
  },
};

export const IpsWithPopover: StoryObj<IpsProps> = {
  render: PopoverTemplate,
  args: {
    ips: [
      '10.200.0.202',
      '192.14.29.80',
      '74.25.14.20',
      '172.16.0.1',
      '203.0.113.1',
      '198.51.100.1',
      '192.0.2.1',
    ],
  },
};
