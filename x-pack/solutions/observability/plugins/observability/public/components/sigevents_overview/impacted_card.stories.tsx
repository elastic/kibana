/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ImpactedCard } from './impacted_card';

const meta: Meta<typeof ImpactedCard> = {
  title: 'app/SigeventsOverview/ImpactedCard',
  component: ImpactedCard,
};

export default meta;
type Story = StoryObj<typeof ImpactedCard>;

export const Default: Story = {
  args: {
    label: 'Service',
    value: 'payment',
    iconType: 'package',
  },
};

export const CheckoutService: Story = {
  args: {
    label: 'Service',
    value: 'checkout',
    iconType: 'package',
  },
};

export const NumericValue: Story = {
  args: {
    label: 'Dropped events',
    value: '1,000,000',
    iconType: 'warning',
  },
};

export const Clickable: Story = {
  args: {
    label: 'Service',
    value: 'payment',
    iconType: 'package',
    onClick: action('onClick'),
  },
};
