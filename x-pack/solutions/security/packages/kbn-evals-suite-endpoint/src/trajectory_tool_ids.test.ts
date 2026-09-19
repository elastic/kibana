/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KNOWLEDGE_LOOKUP_TOOL_IDS, extractTrajectoryToolIds } from './trajectory_tool_ids';

const toolCall = (toolId: string) => ({ type: 'tool_call', tool_id: toolId, results: [] });

describe('extractTrajectoryToolIds', () => {
  it('keeps the tool calls that act', () => {
    expect(
      extractTrajectoryToolIds({
        steps: [toolCall('endpoint-response-actions.list_endpoints')],
      })
    ).toEqual(['endpoint-response-actions.list_endpoints']);
  });

  it('drops the knowledge lookups a run needs to reach a skill', () => {
    // Measured on the write-action boundary row: a run that declined the write
    // correctly still called search_relevant_skills and platform.core.sml_search.
    expect(
      extractTrajectoryToolIds({
        steps: [
          toolCall('platform.core.sml_search'),
          toolCall('search_relevant_skills'),
          toolCall('load_skill'),
          toolCall('filestore.read'),
        ],
      })
    ).toEqual([]);
  });

  it('keeps API discovery, which is the agent hunting for a way to act', () => {
    expect(
      extractTrajectoryToolIds({ steps: [toolCall('discover_apis'), toolCall('execute_api')] })
    ).toEqual(['discover_apis', 'execute_api']);
  });

  it('ignores non tool-call steps and outputs without steps', () => {
    expect(extractTrajectoryToolIds({ steps: [{ type: 'reasoning' }] })).toEqual([]);
    expect(extractTrajectoryToolIds({})).toEqual([]);
  });

  it('pins the ids the platform actually emits', () => {
    // The filter is worthless if it names ids the platform never emits — the
    // failure mode the boundary row's forbidden-tool list had.
    expect([...KNOWLEDGE_LOOKUP_TOOL_IDS].sort()).toEqual([
      'filestore.read',
      'load_skill',
      'platform.core.sml_search',
      'search_relevant_skills',
    ]);
  });
});
