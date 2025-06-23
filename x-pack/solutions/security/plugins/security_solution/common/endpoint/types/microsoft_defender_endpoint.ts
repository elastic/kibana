/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MicrosoftDefenderEndpointActionRequestCommonMeta {
  /** The ID of the action in Microsoft Defender's system */
  machineActionId: string;
}

/**
 * The log record that is ingested into Elasticsearch by the Microsoft Defender for Endpoint integration
 *
 * NOTE:  not all properties are currently mapped below. Check the index definition if wanting to
 *        see what else is available and add it below if needed
 */
export interface MicrosoftDefenderEndpointLogEsDoc {
  agent: {
    id: string;
    type: string;
    version: string;
  };
  cloud: {
    instance: {
      id: string;
    };
  };
  microsoft: {
    defender_endpoint: Record<string, unknown>;
  };
}

export interface MicrosoftDefenderEndpointActionRequestFileMeta
  extends MicrosoftDefenderEndpointActionRequestCommonMeta {
  // Timestamp of when the file was created
  createdAt: string;
  // Name of the file
  filename: string;
}
