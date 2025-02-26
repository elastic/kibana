/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryFn, Meta } from '@storybook/react';
import React from 'react';
import { InfraLoadingPanel } from '..';
import { decorateWithGlobalStorybookThemeProviders } from '../../../test_utils/use_global_storybook_theme';

export default {
  title: 'infra/InfraLoadingPanel',
  decorators: [
    (wrappedStory) => <div style={{ width: 600 }}>{wrappedStory()}</div>,
    decorateWithGlobalStorybookThemeProviders,
  ],
} as Meta;

export const LoadingPanel: StoryFn = () => (
  <InfraLoadingPanel text="test" width={200} height={200} />
);
