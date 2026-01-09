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

export type EnhancementTypeOption = Map<EnhancementType, string>;

export const QRADAR_ENHANCEMENT_OPTS: EnhancementTypeOption = new Map([
  [EnhancementType.MITRE, 'MITRE ATT&CK Mappings'],
]);

export interface AddedEnhancement {
  type: EnhancementType;
  fileName: string;
}
