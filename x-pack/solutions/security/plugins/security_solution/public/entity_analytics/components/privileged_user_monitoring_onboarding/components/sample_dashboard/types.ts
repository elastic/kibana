/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TableItemType extends Record<string, string> {
  privileged_user: string;
  target_user: string;
  right: string;
  ip: string;
  '@timestamp': string;
}

export interface UserRowData {
  quantity: number;
  user: string;
  target: string;
  right: string;
  ip: string;
}
