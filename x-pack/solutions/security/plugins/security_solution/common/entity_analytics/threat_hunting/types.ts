/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ThreatHuntingQueryEsDoc {
  '@timestamp': string;
  author: string;
  description: string;
  integration: string[];
  uuid: string;
  name: string;
  language: string[];
  license: string;
  notes: string[];
  mitre: string[];
  references: string[];
  queries: ThreatHuntingQueryEsDocQuery[];
}

export interface ThreatHuntingQueryEsDocQuery {
  query: string;
  indices: string[];
  cleaned_query: string;
}
