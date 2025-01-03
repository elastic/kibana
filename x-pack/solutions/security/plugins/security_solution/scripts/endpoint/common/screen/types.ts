/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * An item representing a choice/item to be shown on a screen
 */
export interface Choice {
  /** The keyboard key (or combination of keys) that the user will enter to select this choice */
  key: string;
  /** The title of the choice */
  title: string;
}
