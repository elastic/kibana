/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MatchedStateFromActor } from '@kbn/xstate-utils';
import { LogStreamQueryActorRef } from '../../../log_stream_query_state';
import { LogStreamPageActorRef } from './state_machine';

type LogStreamPageStateWithLogViewIndices =
  | MatchedStateFromActor<LogStreamPageActorRef, 'hasLogViewIndices'>
  | MatchedStateFromActor<LogStreamPageActorRef, { hasLogViewIndices: 'initialized' }>
  | MatchedStateFromActor<LogStreamPageActorRef, { hasLogViewIndices: 'uninitialized' }>;

export const selectLogStreamQueryChildService = (
  state: LogStreamPageStateWithLogViewIndices
): LogStreamQueryActorRef => state.children.logStreamQuery;
