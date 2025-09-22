/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { extractErrorMessage } from '@kbn/cloud-security-posture-common/utils/helpers';
import type { Node, Edge } from '@xyflow/react';
import { Position } from '@xyflow/react';
import type {
  NodeViewModel,
  NodeDocumentDataViewModel,
  EntityNodeViewModel,
  LabelNodeViewModel,
  GroupNodeViewModel,
  EdgeViewModel,
} from './types';

export const isEntityNode = (node: NodeViewModel): node is EntityNodeViewModel =>
  node.shape === 'ellipse' ||
  node.shape === 'pentagon' ||
  node.shape === 'rectangle' ||
  node.shape === 'diamond' ||
  node.shape === 'hexagon';

export const isLabelNode = (node: NodeViewModel): node is LabelNodeViewModel =>
  node.shape === 'label';

export const isStackNode = (node: NodeViewModel): node is GroupNodeViewModel =>
  node.shape === 'group';

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
  if (
    !hasNodeDocumentsData(node) ||
    (mode !== 'single-alert' && mode !== 'single-event' && mode !== 'single-entity')
  ) {
    return undefined;
  }

  // For single-entity mode, prioritize finding the entity document
  if (mode === 'single-entity') {
    return node.documentsData.find((doc) => doc.type === 'entity');
  }

  // For single-alert and single-event modes, prefer alert document over event document
  const documentData =
    node.documentsData.find((doc) => doc.type === 'alert') ??
    node.documentsData.find((doc) => doc.type === 'event');

  return documentData;
};

const FETCH_GRAPH_FAILED_TEXT = i18n.translate(
  'securitySolutionPackages.csp.graph.investigation.errorFetchingGraphData',
  {
    defaultMessage: 'Error fetching graph data',
  }
);

export const showErrorToast = (
  toasts: CoreStart['notifications']['toasts'],
  error: unknown
): void => {
  if (error instanceof Error) {
    toasts.addError(error, { title: FETCH_GRAPH_FAILED_TEXT });
  } else {
    toasts.addDanger(extractErrorMessage(error, FETCH_GRAPH_FAILED_TEXT));
  }
};

export const buildGraphFromViewModels = (
  nodesModel: NodeViewModel[],
  edgesModel: EdgeViewModel[],
  interactive = true
): {
  nodes: Array<Node<NodeViewModel>>;
  edges: Array<Edge<EdgeViewModel>>;
} => {
  const nodesById: { [key: string]: NodeViewModel } = {};

  const nodes = nodesModel.map((nodeData) => {
    nodesById[nodeData.id] = nodeData;

    const node: Node<NodeViewModel> = {
      id: nodeData.id,
      type: nodeData.shape,
      data: { ...nodeData, interactive },
      position: { x: 0, y: 0 }, // Default position, should be updated later
    };

    if (node.type === 'group' && nodeData.shape === 'group') {
      node.sourcePosition = Position.Right;
      node.targetPosition = Position.Left;
      node.resizing = false;
      node.focusable = false;
    } else if (nodeData.shape === 'label' && nodeData.parentId) {
      node.parentId = nodeData.parentId;
      node.extent = 'parent';
      node.expandParent = false;
      node.draggable = false;
    }

    return node;
  });

  const edges: Array<Edge<EdgeViewModel>> = edgesModel
    .filter((edgeData) => nodesById[edgeData.source] && nodesById[edgeData.target])
    .map((edgeData) => {
      const isIn =
        nodesById[edgeData.source].shape !== 'label' &&
        nodesById[edgeData.target].shape === 'group';
      const isInside =
        nodesById[edgeData.source].shape === 'group' &&
        nodesById[edgeData.target].shape === 'label';
      const isOut =
        nodesById[edgeData.source].shape === 'label' &&
        nodesById[edgeData.target].shape === 'group';
      const isOutside =
        nodesById[edgeData.source].shape === 'group' &&
        nodesById[edgeData.target].shape !== 'label';

      return {
        id: edgeData.id,
        type: 'default',
        source: edgeData.source,
        sourceHandle: isInside ? 'inside' : isOutside ? 'outside' : undefined,
        target: edgeData.target,
        targetHandle: isIn ? 'in' : isOut ? 'out' : undefined,
        focusable: false,
        selectable: false,
        deletable: false,
        data: {
          ...edgeData,
          sourceShape: nodesById[edgeData.source].shape,
          sourceColor: nodesById[edgeData.source].color,
          targetShape: nodesById[edgeData.target].shape,
          targetColor: nodesById[edgeData.target].color,
        },
      };
    });

  return { nodes, edges };
};

export const showStackedShape = (count?: number) => !!count && count > 1;
