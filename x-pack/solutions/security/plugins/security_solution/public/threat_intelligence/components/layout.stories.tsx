/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import { EuiText } from '@elastic/eui';
import { DefaultPageLayout } from './layout';
import { StoryProvidersComponent } from '../mocks/story_providers';

export default {
  title: 'DefaultPageLayout',
  component: DefaultPageLayout,
};

export const Default: StoryFn = () => {
  const title = 'Title with border below';
  const children = <EuiText>{'Content with border above'}</EuiText>;

  return (
    <StoryProvidersComponent>
      <DefaultPageLayout pageTitle={title}>{children}</DefaultPageLayout>
    </StoryProvidersComponent>
  );
};

export const NoBorder: StoryFn = () => {
  const title = 'Title without border';
  const border = false;
  const children = <EuiText>{'Content without border'}</EuiText>;

  return (
    <StoryProvidersComponent>
      <DefaultPageLayout pageTitle={title} border={border}>
        {children}
      </DefaultPageLayout>
    </StoryProvidersComponent>
  );
};
