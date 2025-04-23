/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatHuntingQueryIndexStatus } from '../../api/entity_analytics/threat_hunting/common.gen';

export interface ThreatHuntingQueryEsDoc {
  '@timestamp': string;
  author: string;
  category: string;
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

export interface ThreatHuntingQueryEsDocWithIndexCheck extends ThreatHuntingQueryEsDoc {
  index_status: ThreatHuntingQueryIndexStatus;
}

export interface ThreatHuntingQueryEsDocQuery {
  query: string;
  indices: string[];
  cleaned_query: string;
}

export interface ThreatHuntingQueryESQLResult {
  '@timestamp': string;
  author: string;
  category: string;
  description: string;
  integration: string[];
  uuid: string;
  name: string;
  language: string[];
  license: string;
  notes: string[];
  mitre: string[];
  references: string[];
  'queries.query': string | string[];
  'queries.indices': string | string[];
  'queries.cleaned_query': string | string[];
  index_status: ThreatHuntingQueryIndexStatus;
}
