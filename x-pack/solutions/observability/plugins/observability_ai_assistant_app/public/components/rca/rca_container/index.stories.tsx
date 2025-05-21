/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { noop } from 'lodash';
import { RootCauseAnalysisContainer } from '.';
// @ts-ignore
import fullAnalysis from '../mock/complete_root_cause_analysis.json';

const stories: Meta = {
  title: 'RCA/Container',
  component: RootCauseAnalysisContainer,
};

export default stories;

const handlers = {
  onStartAnalysisClick: noop,
  onStopAnalysisClick: noop,
  onResetAnalysisClick: noop,
  onCompleteInBackgroundClick: noop,
  onClearAnalysisClick: noop,
};

export const Empty: StoryFn = () => {
  return <RootCauseAnalysisContainer completeInBackground loading={false} {...handlers} />;
};

export const Loading: StoryFn = () => {
  return <RootCauseAnalysisContainer completeInBackground loading {...handlers} />;
};

export const LoadingWithoutCompleteInBackground: StoryFn = () => {
  return <RootCauseAnalysisContainer completeInBackground={false} loading {...handlers} />;
};

const error = new Error('Failed to load analysis');

export const WithError: StoryFn = () => {
  return (
    <RootCauseAnalysisContainer completeInBackground loading={false} {...handlers} error={error} />
  );
};

export const Completed: StoryFn = () => {
  return (
    <RootCauseAnalysisContainer
      completeInBackground
      loading={false}
      events={fullAnalysis as any[]}
      {...handlers}
    />
  );
};
