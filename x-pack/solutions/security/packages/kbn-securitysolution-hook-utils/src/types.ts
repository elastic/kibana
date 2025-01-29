/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents the state of an asynchronous task, along with an initiator
 * function to kick off the work.
 */
export interface Task<Args extends unknown[], Result> {
  loading: boolean;
  error: unknown | undefined;
  result: Result | undefined;
  start: (...args: Args) => void;
}
