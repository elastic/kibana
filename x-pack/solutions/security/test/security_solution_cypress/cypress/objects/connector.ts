/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Connector {
  name: string;
}

export interface EmailConnector extends Connector {
  from: string;
  host: string;
  port: string;
  user: string;
  password: string;
  service: string;
  type: 'email';
}

export interface IndexConnector extends Connector {
  index: string;
  document: string;
  type: 'index';
}

export type Connectors = IndexConnector | EmailConnector;

export const getEmailConnector = (): EmailConnector => ({
  name: 'Test email connector',
  from: 'test@example.com',
  host: 'example.com',
  port: '80',
  user: 'username',
  password: 'password',
  service: 'Other',
  type: 'email',
});

export const getIndexConnector = (): IndexConnector => ({
  name: 'Test index connector',
  index: 'my-index-000001',
  document: '{"test": "123"}',
  type: 'index',
});
