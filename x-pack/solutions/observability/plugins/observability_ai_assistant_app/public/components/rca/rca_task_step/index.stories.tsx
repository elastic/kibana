/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RootCauseAnalysisTaskStepItem } from '.';
import { EntityBadge } from '../entity_badge';

const stories: Meta = {
  title: 'RCA/TaskStepItem',
  component: RootCauseAnalysisTaskStepItem,
};

export default stories;

export const Pending: StoryFn = () => {
  return (
    <RootCauseAnalysisTaskStepItem
      status="pending"
      label={
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>Investigating</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EntityBadge entity={{ 'service.name': 'controller' }} />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

export const Completed: StoryFn = () => {
  return (
    <RootCauseAnalysisTaskStepItem
      status="completed"
      label={
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>Completed investigation</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EntityBadge entity={{ 'service.name': 'controller' }} />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

export const Failure: StoryFn = () => {
  return (
    <RootCauseAnalysisTaskStepItem
      status="failure"
      label={
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>Failed investigating</EuiFlexItem>
          <EuiBadge color="hollow">service.name:controller</EuiBadge>
        </EuiFlexGroup>
      }
    />
  );
};
