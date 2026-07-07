/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type EsqlLanguage = 'esql';

export interface RuleTranslationSchema {
  ruleName: string;
  // The type is compatible with the validation function used in form schema
  queryBar: { query: { query: string; language: EsqlLanguage } };
}
