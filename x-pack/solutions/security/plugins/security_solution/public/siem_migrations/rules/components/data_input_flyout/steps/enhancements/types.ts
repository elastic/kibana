/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EnhancementType {
  MITRE = 'mitre',
  // Future enhancement types can be added here
}

export interface EnhancementTypeOption {
  value: EnhancementType;
  inputDisplay: string;
}

export const QRADAR_ENHANCEMENT_OPTS: EnhancementTypeOption[] = [
  {
    value: EnhancementType.MITRE,
    inputDisplay: 'MITRE ATT&CK Mappings',
  },
  // Future options can be added here
];

export interface AddedEnhancement {
  type: EnhancementType;
  fileName: string;
}
