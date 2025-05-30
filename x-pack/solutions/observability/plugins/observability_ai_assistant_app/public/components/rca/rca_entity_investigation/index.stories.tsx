/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { RootCauseAnalysisEntityInvestigation } from '.';
import { controllerEntityHealthAnalysis } from '../mock';

const stories: Meta = {
  title: 'RCA/EntityInvestigation',
  component: RootCauseAnalysisEntityInvestigation,
};

export default stories;

export const Default: StoryFn = () => {
  return (
    <RootCauseAnalysisEntityInvestigation
      entity={controllerEntityHealthAnalysis.response.entity}
      summary={controllerEntityHealthAnalysis.response.summary}
      ownPatterns={controllerEntityHealthAnalysis.data.attachments.ownPatterns}
      patternsFromOtherEntities={
        controllerEntityHealthAnalysis.data.attachments.patternsFromOtherEntities
      }
    />
  );
};
