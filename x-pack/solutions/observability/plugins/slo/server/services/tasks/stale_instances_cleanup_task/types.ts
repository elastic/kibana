/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TaskState {
  searchAfter?: string;
  deleteTaskId?: string;
  [key: string]: unknown; // If needed for task manager
}

export interface SpaceSloSettings {
  spaceId: string;
  staleThresholdInHours: number;
}

export interface QueryContainer {
  bool: {
    should: Array<{
      bool: {
        filter: Array<{
          terms?: { spaceId: string[] };
          range?: { summaryUpdatedAt: { lt: string } };
        }>;
      };
    }>;
    minimum_should_match: number;
  };
}
