/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { LegendControls } from './legend_controls';

const meta = {
  component: LegendControls,
  title: 'Waffle Map/Legend controls',
} satisfies Meta<typeof LegendControls>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    options: {
      palette: 'cool',
      reverseColors: false,
      steps: 10,
    },
    dataBounds: {
      min: 0,
      max: 0.0637590382345481,
    },
    bounds: {
      min: 0,
      max: 0.0637590382345481,
    },
    autoBounds: true,
    boundsOverride: {
      max: 1,
      min: 0,
    },
    onChange: () => {},
  },
};
