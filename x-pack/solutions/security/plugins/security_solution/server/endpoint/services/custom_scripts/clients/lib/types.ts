/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomScriptsResponse } from '../../../../../../common/endpoint/types/custom_scripts';

/**
 * Interface for custom scripts clients
 * Each provider (CrowdStrike, SentinelOne, etc.) should implement this interface
 */
export interface CustomScriptsClientInterface {
  /**
   * Retrieves custom scripts available for the specified agent IDs
   * @returns Promise resolving to a standardized custom scripts response
   */
  getCustomScripts: () => Promise<CustomScriptsResponse>;
}
