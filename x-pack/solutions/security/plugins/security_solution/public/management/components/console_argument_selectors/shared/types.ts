/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Base state interface for all argument selectors
 */
export interface BaseSelectorState {
  isPopoverOpen: boolean;
  selectedOption?: unknown;
}

/**
 * Configuration object for argument selectors
 */
export interface BaseSelectorConfig {
  initialLabel: string;
  tooltipText: string;
  minWidth: number;
  rowHeight: number;
  selectableId: string;
}
