/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MitreTechnique {
  id: string;
  name: string;
  confidence: number;
}

export interface MitreTactic {
  id: string;
  name: string;
}

export interface MitreMapping {
  techniques: MitreTechnique[];
  tactics: MitreTactic[];
  phase: string;
  reasoning: string;
}

export interface SecurityFeatures {
  processName?: string;
  processCommandLine?: string;
  eventAction?: string;
  networkProtocol?: string;
  networkDirection?: string;
  sourceIp?: string;
  destinationIp?: string;
  fileName?: string;
  filePath?: string;
  fileHash?: string;
  registryPath?: string;
  registryValue?: string;
  userDomain?: string;
}
