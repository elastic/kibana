/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { FlyoutLoading } from './flyout_loading';

export default {
  component: FlyoutLoading,
  title: 'Flyout/FlyoutLoading',
};

export const Default: Story<void> = () => {
  return <FlyoutLoading />;
};
