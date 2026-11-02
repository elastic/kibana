/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the localStorage key for a scope's selected data view.
 * The key includes the space ID so that each space maintains its own
 * selection independently.
 */
export const getSelectedDataViewStorageKey = (spaceId: string, scope: string): string =>
  `securitySolution.dataViewManager.selectedDataView.${spaceId}.${scope}`;
