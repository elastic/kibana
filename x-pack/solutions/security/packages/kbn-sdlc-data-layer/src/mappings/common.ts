/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

export const SYNC_META_PROPERTIES = {
  '@timestamp': { type: 'date' },
  sync: {
    properties: {
      run_id: { type: 'keyword' },
      source: { type: 'keyword' },
    },
  },
} as const;

export const ENTITY_PROPERTIES = {
  entity: {
    properties: {
      type: { type: 'keyword' },
      subtype: { type: 'keyword' },
      id: { type: 'keyword' },
      url: { type: 'keyword' },
      number: { type: 'integer' },
    },
  },
  github: {
    properties: {
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
      closed_at: { type: 'date' },
      state: { type: 'keyword' },
    },
  },
  org: {
    properties: {
      login: { type: 'keyword' },
    },
  },
  repository: {
    properties: {
      name: { type: 'keyword' },
      full_name: { type: 'keyword' },
    },
  },
  labels: { type: 'keyword' },
  people: {
    properties: {
      author: { type: 'keyword' },
      assignees: { type: 'keyword' },
      reviewers: { type: 'keyword' },
    },
  },
} as const;
