/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeViewModel, NodeDocumentDataViewModel } from './types';

export const isEntityNode = (node: NodeViewModel) =>
  node.shape === 'ellipse' ||
  node.shape === 'pentagon' ||
  node.shape === 'rectangle' ||
  node.shape === 'diamond' ||
  node.shape === 'hexagon';

/**
 * Returns the node document mode, or 'na' if documentsData is missing or empty.
 * When this function returns a value other than 'na', documentsData is guaranteed to be a non-empty array.
 */
export const getNodeDocumentMode = (
  node: NodeViewModel
):
  | 'single-alert'
  | 'single-event'
  | 'single-entity'
  | 'grouped-events'
  | 'grouped-entities'
  | 'na' => {
  if (!hasNodeDocumentsData(node)) {
    return 'na';
  }

  // Single alert contains both event's document data and alert's document data.
  if (node.documentsData.find((doc) => doc.type === 'alert') && node.documentsData.length < 2) {
    return 'single-alert';
  } else if (node.documentsData.length === 1 && node.documentsData[0].type === 'event') {
    return 'single-event';
  } else if (isEntityNode(node) && node.documentsData.length === 1) {
    return 'single-entity';
  } else if (isEntityNode(node) && node.documentsData.length > 1) {
    return 'grouped-entities';
  } else if (node.documentsData.length > 1) {
    return 'grouped-events';
  }

  return 'na';
};

/**
 * Type guard: Returns true if node.documentsData is a non-empty array.
 * This only narrows node.documentsData to a non-empty array, not to a specific document type.
 */
export function hasNodeDocumentsData(node: NodeViewModel): node is NodeViewModel & {
  documentsData: [NodeDocumentDataViewModel, ...NodeDocumentDataViewModel[]];
} {
  return Array.isArray(node.documentsData) && node.documentsData.length > 0;
}
