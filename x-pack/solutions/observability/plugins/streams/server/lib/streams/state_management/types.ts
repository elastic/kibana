/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import {
  GroupStreamUpsertRequest,
  StreamDefinition,
  WiredStreamUpsertRequest,
} from '@kbn/streams-schema';
import { State } from './state'; // Does this create a circular dependency?

export interface ValidationResult {
  isValid: boolean;
  errors: string[]; // Or Errors?
}

// Interface or abstract class to make somethings private?
export interface StreamActiveRecord {
  definition: StreamDefinition;
  clone(): StreamActiveRecord;
  markForDeletion(): void;
  update(newDefinition: StreamDefinition): void;
  validate(
    desiredState: State,
    startingState: State,
    scopedClusterClient: IScopedClusterClient
  ): Promise<ValidationResult>;
}

interface WiredStreamUpsertChange {
  target: string;
  type: 'wired_upsert';
  request: WiredStreamUpsertRequest & {
    stream: {
      name: string;
    };
  };
}

interface GroupStreamUpsertChange {
  target: string;
  type: 'group_upsert';
  request: GroupStreamUpsertRequest & {
    stream: {
      name: string;
    };
  };
}

interface StreamDeleteChange {
  target: string;
  type: 'delete';
}

export type StreamChange = WiredStreamUpsertChange | GroupStreamUpsertChange | StreamDeleteChange;
