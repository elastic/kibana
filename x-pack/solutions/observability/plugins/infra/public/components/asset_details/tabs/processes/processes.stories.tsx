/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import {
  DecorateWithKibanaContext,
  DecorateWithAssetDetailsStateContext,
  DecorateWithTabSwitcherContext,
} from '../../__stories__/decorator';
import { Processes } from './processes';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';

const stories: Meta = {
  title: 'infra/Asset Details View/Components/Processes',
  decorators: [
    decorateWithGlobalStorybookThemeProviders,
    DecorateWithTabSwitcherContext('processes'),
    DecorateWithAssetDetailsStateContext,
    DecorateWithKibanaContext,
  ],
  component: Processes,
};

const Template: StoryFn = () => {
  return <Processes />;
};

export const Default = {
  render: Template,
  args: {},
};

export const OnlySummary = {
  render: Template,

  parameters: {
    apiResponse: {
      mock: 'onlySummary',
    },
  },
};

export const OnlyProcesses = {
  render: Template,

  parameters: {
    apiResponse: {
      mock: 'onlyProcesses',
    },
  },
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
