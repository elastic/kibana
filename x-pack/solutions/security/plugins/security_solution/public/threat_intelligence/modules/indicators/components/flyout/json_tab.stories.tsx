/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { generateMockIndicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorsFlyoutJson } from './json_tab';

export default {
  component: IndicatorsFlyoutJson,
  title: 'IndicatorsFlyoutJson',
};

export const Default: StoryFn = () => {
  const mockIndicator: Indicator = generateMockIndicator();

  return <IndicatorsFlyoutJson indicator={mockIndicator} />;
};

export const EmptyIndicator: StoryFn = () => {
  return <IndicatorsFlyoutJson indicator={{} as unknown as Indicator} />;
};
