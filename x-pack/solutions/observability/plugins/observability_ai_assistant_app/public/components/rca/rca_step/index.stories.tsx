/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RootCauseAnalysisStepItem } from '.';

const stories: Meta<{}> = {
  title: 'RCA/StepItem',
  component: RootCauseAnalysisStepItem,
};

export default stories;

export const Default: StoryFn<{}> = () => {
  return (
    <RootCauseAnalysisStepItem
      label={
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>Investigating</EuiFlexItem>
          <EuiBadge color="hollow">service.name:controller</EuiBadge>
        </EuiFlexGroup>
      }
    />
  );
};

export const Loading: StoryFn<{}> = () => {
  return (
    <RootCauseAnalysisStepItem
      loading
      label={
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>Investigating</EuiFlexItem>
          <EuiBadge color="hollow">service.name:controller</EuiBadge>
        </EuiFlexGroup>
      }
    />
  );
};

export const WithColor: StoryFn<{}> = () => {
  return (
    <RootCauseAnalysisStepItem
      loading
      color="primary"
      label={
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>Investigating</EuiFlexItem>
          <EuiBadge color="hollow">service.name:controller</EuiBadge>
        </EuiFlexGroup>
      }
    />
  );
};
