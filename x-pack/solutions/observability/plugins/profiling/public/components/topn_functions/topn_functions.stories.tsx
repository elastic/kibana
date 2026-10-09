/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta } from '@storybook/react';
import React from 'react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { TopNFunctionsView } from '../../views/functions/topn';
import { MockProfilingDependenciesStorybook } from '../contexts/profiling_dependencies/mock_profiling_dependencies_storybook';
import type { ProfilingSchemaContextValue } from '../contexts/profiling_schema/profiling_schema_context';
import { data } from './mock/top_n_functions';

const profilingSchemaContext: ProfilingSchemaContextValue = {
  selectedSchema: ProfilingSchema.OTEL,
  schemas: [ProfilingSchema.OTEL],
  supportedSchemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
  isLoading: false,
  onSchemaChange: () => {},
};

const stories: Meta<{}> = {
  title: 'Views/TopN functions',
  component: TopNFunctionsView,
  decorators: [
    (StoryComponent, { globals }) => {
      return (
        <MockProfilingDependenciesStorybook
          routePath="/functions/topn?rangeFrom=now-15m&rangeTo=now&kuery=&sortField=rank&sortDirection=asc"
          mockServices={{
            fetchTopNFunctions: async () => data,
          }}
          profilingSchemaContext={profilingSchemaContext}
        >
          <StoryComponent />
        </MockProfilingDependenciesStorybook>
      );
    },
  ],
};

export default stories;

export function Examples() {
  return <TopNFunctionsView />;
}
