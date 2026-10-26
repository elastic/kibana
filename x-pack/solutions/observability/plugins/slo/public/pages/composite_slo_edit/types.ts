/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CompositeSLOMember {
  sloId: string;
  sloName: string; // UI-only: not sent to the API
  groupBy: string | string[]; // UI-only: used to determine if instance selector should be shown
  instanceId?: string;
  weight: number;
}

export interface CreateCompositeSLOForm {
  name: string;
  description: string;
  members: CompositeSLOMember[];
  timeWindow: {
    duration: string;
    type: 'rolling';
  };
  objective: {
    target: number;
  };
  tags: string[];
}
