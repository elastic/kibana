/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AfterKey = Record<string, string> | undefined;

export interface UserBucket {
  key: { username: string };
  doc_count: number;
}

export interface UsersAggregation {
  users?: {
    after_key?: AfterKey;
    buckets: UserBucket[];
  };
}
