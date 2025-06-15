/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RuleSummaryResponse {
  keywords: string;
  mitre_attack: {
    tactic: {
      id: string;
      name: string;
      techniques: Array<{
        id: string;
        name: string;
      }>;
    };
  };
}
