/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AppDeepLinkId, NodeDefinition } from '@kbn/core-chrome-browser';
// Recursive function to find and remove nodes with specified IDs, handling nested structures
export const findAndRemoveNodes = (
  nodes: Array<NodeDefinition<AppDeepLinkId>>,
  idsToAttach: string[]
): Array<NodeDefinition<AppDeepLinkId>> => {
  return nodes.reduce<Array<NodeDefinition<AppDeepLinkId>>>((attachedNodes, node, index, arr) => {
    if (idsToAttach.includes(node.id as string)) {
      attachedNodes.push(node);
      arr.splice(index, 1);
    } else if (node.children) {
      attachedNodes.push(...findAndRemoveNodes(node.children, idsToAttach));
    }
    return attachedNodes;
  }, []);
};
