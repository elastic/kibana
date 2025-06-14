/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';
import { Metadata } from './metadata';
import {
  DecorateWithKibanaContext,
  DecorateWithAssetDetailsStateContext,
  DecorateWithTabSwitcherContext,
} from '../../__stories__/decorator';

const stories: Meta = {
  title: 'infra/Asset Details View/Components/Metadata',
  decorators: [
    decorateWithGlobalStorybookThemeProviders,
    DecorateWithTabSwitcherContext('metadata'),
    DecorateWithAssetDetailsStateContext,
    DecorateWithKibanaContext,
  ],
  component: Metadata,
};

const Template: StoryFn = () => {
  return <Metadata />;
};

export const Default = {
  render: Template,
};

export const NoData = {
  render: Template,

  parameters: {
    apiResponse: {
      mock: 'noData',
    },
  },
};

export const LoadingState = {
  render: Template,

  parameters: {
    apiResponse: {
      mock: 'loading',
    },
  },
};

export const ErrorState = {
  render: Template,

  parameters: {
    apiResponse: {
      mock: 'error',
    },
  },
};

export default stories;
