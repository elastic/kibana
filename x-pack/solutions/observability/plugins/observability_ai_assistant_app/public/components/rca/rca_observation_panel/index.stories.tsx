/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { RootCauseAnalysisObservationPanel } from '.';

const stories: Meta = {
  title: 'RCA/ObservationPanel',
  component: RootCauseAnalysisObservationPanel,
};

const content =
  'The high rate of HTTP 500 errors in the controller service for the /api/cart endpoint is likely due to issues with the upstream service default-my-otel-demo-frontendproxy-8080, as indicated by logs showing upstream prematurely closed connections. The next step is to investigate the health and performance of the upstream service default-my-otel-demo-frontendproxy-8080.';

export default stories;

export const Default: StoryFn = () => {
  return (
    <RootCauseAnalysisObservationPanel title={'High rate of HTTP 500 errors'} content={content} />
  );
};

export const Loading: StoryFn = () => {
  return (
    <RootCauseAnalysisObservationPanel
      title={'High rate of HTTP 500 errors'}
      content={content}
      loading
    />
  );
};
