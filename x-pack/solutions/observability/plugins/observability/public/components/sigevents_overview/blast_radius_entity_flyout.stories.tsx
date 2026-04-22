/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { BlastRadiusEntityFlyout } from './blast_radius_entity_flyout';

const meta: Meta<typeof BlastRadiusEntityFlyout> = {
  title: 'app/SigeventsOverview/BlastRadiusEntityFlyout',
  component: BlastRadiusEntityFlyout,
};

export default meta;
type Story = StoryObj<typeof BlastRadiusEntityFlyout>;

export const CriticallyAffected: Story = {
  args: {
    title: 'Critically affected entities',
    onClose: action('onClose'),
  },
};

export const HighRisk: Story = {
  args: {
    title: 'High risk entities',
    onClose: action('onClose'),
  },
};

export const CustomEntity: Story = {
  args: {
    title: 'Production database servers',
    onClose: action('onClose'),
  },
};
