/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface User {
  username: string;
  password: string;
  roles: string[];
  superuser?: boolean;
  description?: string;
}

export interface Role {
  name: string;
  privileges: any;
}

export interface ExpectedResponse {
  httpCode: number;
  expectResponse: (
    body: Record<
      string,
      {
        tags: Array<{ id: string }>; // for the purposes of testing, we only care about the tags' id field
      }
    >
  ) => void | Promise<void>;
}
