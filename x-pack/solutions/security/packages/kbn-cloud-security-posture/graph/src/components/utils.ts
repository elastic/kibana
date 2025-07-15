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

export const isStackedLabel = (node: NodeViewModel): boolean =>
  !(node.shape === 'label' && Boolean(node.parentId));

/**
 * Type guard: Returns true if node.documentsData is a non-empty array.
 * This only narrows node.documentsData to a non-empty array, not to a specific document type.
 */
export const hasNodeDocumentsData = (
  node: NodeViewModel
): node is NodeViewModel & {
  documentsData: [NodeDocumentDataViewModel, ...NodeDocumentDataViewModel[]];
} => {
  return Array.isArray(node.documentsData) && node.documentsData.length > 0;
};

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
  if (node.documentsData.find((doc) => doc.type === 'alert') && node.documentsData.length <= 2) {
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
 * Returns the single document data for a node if it is in single-* mode.
 * If the node is not in one of these modes, or if it has no documentsData, it returns undefined.
 */
export const getSingleDocumentData = (
  node: NodeViewModel
): NodeDocumentDataViewModel | undefined => {
  const mode = getNodeDocumentMode(node);
  if (!hasNodeDocumentsData(node) || (mode !== 'single-alert' && mode !== 'single-event')) {
    return undefined;
  }

  // For single-alert we might have both event and alert documents. We prefer to return the alert document if it exists.
  const documentData =
    node.documentsData.find((doc) => doc.type === 'alert') ??
    node.documentsData.find((doc) => doc.type === 'event');

  return documentData;
};
