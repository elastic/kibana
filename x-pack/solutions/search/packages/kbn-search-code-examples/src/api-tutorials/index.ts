/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Export examples built from documentation
//   at https://www.elastic.co/docs/solutions/search/api-quickstarts

import { basicsTutorialCommands } from './basics_tutorial';
import { semanticTutorialCommands } from './semantic_tutorial';
import { esqlTutorialCommands } from './esql_tutorial';
import { agentBuilderTutorialCommands } from './agent_builder';

import type { ConsoleTutorial } from './types';
import { timeSeriesDataStreamTutorialCommands } from './time_series_data_stream_tutorial';

export const consoleTutorials: ConsoleTutorial = {
  basics: basicsTutorialCommands,
  queryDSL: `# Query DSL Tutorial`,
  esql: esqlTutorialCommands,
  aggregations: `# Aggregations Tutorial`,
  semanticSearch: semanticTutorialCommands,
  timeSeriesDataStreams: timeSeriesDataStreamTutorialCommands,
  hybridSearch: `# Hybrid Search Tutorial`,
  vectorSearch: `# Vector Search Tutorial`,
  agentBuilder: agentBuilderTutorialCommands,
};
