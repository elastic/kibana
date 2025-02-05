/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EsAnonymizationFieldsSchema {
  id: string;
  '@timestamp': string;
  created_at: string;
  created_by: string;
  field: string;
  anonymized?: boolean;
  allowed?: boolean;
  updated_at?: string;
  updated_by?: string;
  namespace: string;
}

export interface UpdateAnonymizationFieldSchema {
  id: string;
  '@timestamp'?: string;
  anonymized?: boolean;
  allowed?: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface CreateAnonymizationFieldSchema {
  '@timestamp'?: string;
  field: string;
  anonymized?: boolean;
  allowed?: boolean;
  updated_at?: string;
  updated_by?: string;
  created_at?: string;
  created_by?: string;
}
