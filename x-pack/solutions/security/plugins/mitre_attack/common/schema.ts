/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type MitreFramework = 'enterprise' | 'atlas';
export type MitreEntityType = 'tactic' | 'technique' | 'subtechnique';

interface MitreEntityBase {
  framework: MitreFramework;
  framework_version: string;
  id: string;
  name: string;
  reference: string;
  description: string;
  revoked: boolean;
  superseded_by_id?: string[];
  deprecated: boolean;
}

export interface MitreTactic extends MitreEntityBase {
  type: 'tactic';
  position: number;
}

export interface MitreTechnique extends MitreEntityBase {
  type: 'technique';
  tactic_ids: string[];
}

export interface MitreSubtechnique extends MitreEntityBase {
  type: 'subtechnique';
  tactic_ids: string[];
  technique_id: string;
}

export type MitreEntity = MitreTactic | MitreTechnique | MitreSubtechnique;

export type MitreEntityAttributes = MitreEntity & { semantic_content?: string };
