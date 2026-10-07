/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The newest index created within the deployment's recent history, as reported by the deployment
 * stats endpoint. Shared so the route's response and the UI reading it cannot drift apart.
 */
export interface NewIndexDetails {
  indexName: string;
  documentsCount: number;
  sizeInBytes: number;
  createdAt: number;
}
