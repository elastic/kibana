/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
// Recursive function to find and move nodes with specified IDs to another section, handling nested structures
export const moveToAnotherSection = (
  nodes: Array<NodeDefinition<AppDeepLinkId>>,
  idsToAttach: string[]
): Array<NodeDefinition<AppDeepLinkId>> => {
  const attachedNodes: Array<NodeDefinition<AppDeepLinkId>> = [];

  const recursiveMoveToAnotherSection = (
    currentNodes: Array<NodeDefinition<AppDeepLinkId>>
  ): Array<NodeDefinition<AppDeepLinkId>> => {
    for (let i = currentNodes.length - 1; i >= 0; i--) {
      const node = currentNodes[i];
      if (idsToAttach.includes(node.id as string)) {
        attachedNodes.unshift(node);
        currentNodes.splice(i, 1);
      } else if (node.children) {
        node.children = recursiveMoveToAnotherSection(node.children);
      }
    }
    return currentNodes;
  };

  recursiveMoveToAnotherSection(nodes);

  return attachedNodes;
};

// Filter nodes from a whitelist of IDs, handling nested structures
export const filterFromWhitelist = (
  nodes: Array<NodeDefinition<AppDeepLinkId>>,
  idsToAttach: string[]
): Array<NodeDefinition<AppDeepLinkId>> => {
  const attachedNodes: Array<NodeDefinition<AppDeepLinkId>> = [];
  const stack: Array<NodeDefinition<AppDeepLinkId>> = [...nodes];

  while (stack.length > 0) {
    const node = stack.pop();

    if (idsToAttach.includes(node.id as string)) {
      attachedNodes.unshift(node);
    } else if (node.children) {
      stack.unshift(...node.children);
    }
  }

  return attachedNodes;
};
