/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Usage {
  investigation: {
    total: number;
    by_status: {
      triage: number;
      active: number;
      mitigated: number;
      resolved: number;
      cancelled: number;
    };
    by_origin: {
      alert: number;
      blank: number;
    };
    items: {
      avg: number;
      p90: number;
      p95: number;
      max: number;
      min: number;
    };
    notes: {
      avg: number;
      p90: number;
      p95: number;
      max: number;
      min: number;
    };
  };
}
