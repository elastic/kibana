/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AtlasThreatTacticOption {
  id: string;
  name: string;
  reference: string;
  value: string;
  label: string;
}

export interface AtlasThreatTechniqueOption extends AtlasThreatTacticOption {
  /** Parent ATLAS tactic ids this technique belongs to */
  tacticIds: string[];
}

export interface AtlasThreatSubtechniqueOption extends AtlasThreatTechniqueOption {
  techniqueId: string;
}
