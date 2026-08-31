/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { EntityNodeDetailed } from './entity_node_detailed';
import type { EntityNodeViewModel } from '../../types';

const meta: Meta<typeof EntityNodeDetailed> = {
  title: 'Components/Graph Components/Entity Node Detailed',
  component: EntityNodeDetailed,
};

export default meta;
type Story = StoryObj<typeof EntityNodeDetailed>;

// Note: riskScore & assetCriticality are mocked here so the full card renders in
// Storybook. The live graph hides these rows until the backend supplies them.
const singleData: EntityNodeViewModel = {
  id: 'entity-1',
  label: 'Entity name',
  color: 'primary',
  shape: 'rectangle',
  icon: 'user',
  entityType: 'Entity type',
  entityIds: ['john.doe@12345678@activedirectory'],
  ips: ['10.128.0.93'],
  countryCodes: ['us'],
  riskScore: { value: 90.01 },
  assetCriticality: { high: 1 },
};

const groupedData: EntityNodeViewModel = {
  ...singleData,
  count: 5,
  entityIds: [
    'john.doe@12345678@activedirectory',
    'jane.roe@12345678@activedirectory',
    'sam.poe@12345678@activedirectory',
  ],
  riskScore: { min: 40.5, max: 90.01 },
  assetCriticality: { extreme: 152, high: 1648, medium: 1982, low: 542 },
};

export const Single: Story = { args: { data: singleData } };
export const Grouped: Story = { args: { data: groupedData } };
export const Danger: Story = { args: { data: { ...singleData, color: 'danger' } } };
export const NoMetadata: Story = { args: { data: { ...singleData, showMetadata: false } } };
