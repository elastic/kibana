/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a custom script unified fields used in Scripts picker
 */
export interface CustomScript {
  /**
   * Unique identifier for the script
   */
  id: string;
  /**
   * Display name of the script
   */
  name: string;
  /**
   * Description of what the script does
   */
  description: string;
}

/**
 * Collection of custom scripts
 */
export type CustomScriptsResponse = CustomScript[];
