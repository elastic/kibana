/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import expect from '@kbn/expect';
import { firstNonNullValue } from '@kbn/security-solution-plugin/common/endpoint/models/ecs_safety_helpers';
import { NodeID } from '@kbn/security-solution-plugin/server/endpoint/routes/resolver/tree/utils';
import {
  SafeResolverEvent,
  ResolverNode,
  ResolverSchema,
} from '@kbn/security-solution-plugin/common/endpoint/types';
import {
  parentEntityIDSafeVersion,
  entityIDSafeVersion,
  eventIDSafeVersion,
  timestampSafeVersion,
  timestampAsDateSafeVersion,
} from '@kbn/security-solution-plugin/common/endpoint/models/event';
import {
  Event,
  Tree,
  TreeNode,
  RelatedEventInfo,
  categoryMapping,
} from '@kbn/security-solution-plugin/common/endpoint/generate_data';

/**
 * Schema used for the /tree api post requests that uses the ancestry
 */
export const schemaWithAncestry: ResolverSchema = {
  ancestry: 'process.Ext.ancestry',
  id: 'process.entity_id',
  parent: 'process.parent.entity_id',
};

/**
 * Schema used for the /tree api post requests that does not use the ancestry
 */
export const schemaWithoutAncestry: ResolverSchema = {
  id: 'process.entity_id',
  parent: 'process.parent.entity_id',
};

/**
 * Schema used for the /tree api post requests that uses the name field
 */
export const schemaWithName: ResolverSchema = {
  id: 'process.entity_id',
  parent: 'process.parent.entity_id',
  name: 'process.name',
};

const createLevels = ({
  descendantsByParent,
  levels,
  currentNodes,
  schema,
}: {
  descendantsByParent: Map<NodeID, Map<NodeID, ResolverNode>>;
  levels: Array<Map<NodeID, ResolverNode>>;
  currentNodes: Map<NodeID, ResolverNode> | undefined;
  schema: ResolverSchema;
}): Array<Map<NodeID, ResolverNode>> => {
  if (!currentNodes || currentNodes.size === 0) {
    return levels;
  }
  levels.push(currentNodes);
  const nextLevel: Map<NodeID, ResolverNode> = new Map();
  for (const node of currentNodes.values()) {
    const id = getID(node, schema);
    const children = descendantsByParent.get(id);
    if (children) {
      for (const child of children.values()) {
        const childID = getID(child, schema);
        nextLevel.set(childID, child);
      }
    }
  }
  return createLevels({ descendantsByParent, levels, currentNodes: nextLevel, schema });
};

interface TreeExpectation {
  origin: NodeID;
  nodeExpectations: NodeExpectations;
}

interface NodeExpectations {
  ancestors?: number;
  descendants?: number;
  descendantLevels?: number;
}

interface APITree {
  // entries closer to the beginning of the array are more direct parents of the origin aka
  // ancestors[0] = the origin's parent, ancestors[1] = the origin's grandparent
  ancestors: ResolverNode[];
  // if no ancestors were retrieved then the origin will be undefined
  origin: ResolverNode | undefined;
  descendantLevels: Array<Map<NodeID, ResolverNode>>;
  nodeExpectations: NodeExpectations;
}

/**
 * Represents a utility structure for making it easier to perform expect calls on the response
 * from the /tree api. This can represent multiple trees, since the tree api can return multiple trees.
 */
export interface APIResponse {
  nodesByID: Map<NodeID, ResolverNode>;
  trees: Map<NodeID, APITree>;
  allNodes: ResolverNode[];
}

/**
 * Gets the ID field from a resolver node. Throws an error if the ID doesn't exist.
 *
 * @param node a resolver node
 * @param schema the schema that was used to retrieve this resolver node
 */
export const getID = (node: ResolverNode | undefined, schema: ResolverSchema): NodeID => {
  const id = firstNonNullValue(node?.data[schema.id]);
  if (!id) {
    throw new Error(`Unable to find id ${schema.id} in node: ${JSON.stringify(node)}`);
  }
  return id;
};

const getParentInternal = (
  node: ResolverNode | undefined,
  schema: ResolverSchema
): NodeID | undefined => {
  if (node) {
    return firstNonNullValue(node?.data[schema.parent]);
  }
  return undefined;
};

/**
 * Gets the parent ID field from a resolver node. Throws an error if the ID doesn't exist.
 *
 * @param node a resolver node
 * @param schema the schema that was used to retrieve this resolver node
 */
export const getParent = (node: ResolverNode | undefined, schema: ResolverSchema): NodeID => {
  const parent = getParentInternal(node, schema);
  if (!parent) {
    throw new Error(`Unable to find parent ${schema.parent} in node: ${JSON.stringify(node)}`);
  }
  return parent;
};

/**
 * Reformats the tree's response to make it easier to perform testing on the results.
 *
 * @param treeExpectations the node IDs used to retrieve the trees and the expected number of ancestors/descendants in the
 *  resulting trees
 * @param nodes the response from the tree api
 * @param schema the schema used when calling the tree api
 */
const createTreeFromResponse = (
  treeExpectations: TreeExpectation[],
  nodes: ResolverNode[],
  schema: ResolverSchema
) => {
  const nodesByID = new Map<NodeID, ResolverNode>();
  const nodesByParent = new Map<NodeID, Map<NodeID, ResolverNode>>();

  for (const node of nodes) {
    const id = getID(node, schema);
    const parent = getParentInternal(node, schema);

    nodesByID.set(id, node);

    if (parent) {
      let groupedChildren = nodesByParent.get(parent);
      if (!groupedChildren) {
        groupedChildren = new Map();
        nodesByParent.set(parent, groupedChildren);
      }

      groupedChildren.set(id, node);
    }
  }

  const trees: Map<NodeID, APITree> = new Map();

  for (const expectation of treeExpectations) {
    const descendantLevels = createLevels({
      descendantsByParent: nodesByParent,
      levels: [],
      currentNodes: nodesByParent.get(expectation.origin),
      schema,
    });

    const ancestors: ResolverNode[] = [];
    const originNode = nodesByID.get(expectation.origin);
    if (originNode) {
      let currentID: NodeID | undefined = getParentInternal(originNode, schema);
      // construct an array with all the ancestors from the response. We'll use this to verify that
      // all the expected ancestors were returned in the response.
      while (currentID !== undefined) {
        const parentNode = nodesByID.get(currentID);
        if (parentNode) {
          ancestors.push(parentNode);
        }
        currentID = getParentInternal(parentNode, schema);
      }
    }

    trees.set(expectation.origin, {
      ancestors,
      origin: originNode,
      descendantLevels,
      nodeExpectations: expectation.nodeExpectations,
    });
  }

  return {
    nodesByID,
    trees,
    allNodes: nodes,
  };
};

const verifyAncestry = ({
  responseTrees,
  schema,
  genTree,
}: {
  responseTrees: APIResponse;
  schema: ResolverSchema;
  genTree: Tree;
}) => {
  const allGenNodes = new Map<string, TreeNode>([
    ...genTree.ancestry,
    ...genTree.children,
    [genTree.origin.id, genTree.origin],
  ]);

  for (const tree of responseTrees.trees.values()) {
    if (tree.nodeExpectations.ancestors !== undefined) {
      expect(tree.ancestors.length).to.be(tree.nodeExpectations.ancestors);
    }

    if (tree.origin !== undefined) {
      // make sure the origin node from the request exists in the generated data and has the same fields
      const originID = getID(tree.origin, schema);
      const originParentID = getParent(tree.origin, schema);
      expect(tree.origin.id).to.be(originID);
      expect(tree.origin.parent).to.be(originParentID);
      expect(allGenNodes.get(String(originID))?.id).to.be(String(originID));
      expect(allGenNodes.get(String(originParentID))?.id).to.be(String(originParentID));
      expect(originID).to.be(entityIDSafeVersion(allGenNodes.get(String(originID))!.lifecycle[0]));
      expect(originParentID).to.be(
        parentEntityIDSafeVersion(allGenNodes.get(String(originID))!.lifecycle[0])
      );
      // make sure the lifecycle events are sorted by timestamp in ascending order because the
      // event that will be returned that we need to compare to should be the earliest event
      // found
      const originLifecycleSorted = [...allGenNodes.get(String(originID))!.lifecycle].sort(
        (a: Event, b: Event) => {
          const aTime: number | undefined = timestampSafeVersion(a);
          const bTime = timestampSafeVersion(b);
          if (aTime !== undefined && bTime !== undefined) {
            return aTime - bTime;
          } else {
            return 0;
          }
        }
      );

      const ts = timestampAsDateSafeVersion(tree.origin?.data);
      expect(ts).to.not.be(undefined);
      expect(ts).to.eql(timestampAsDateSafeVersion(originLifecycleSorted[0]));
    }

    // check the constructed ancestors array to see if we're missing any nodes in the ancestry
    for (let i = 0; i < tree.ancestors.length; i++) {
      const id = getID(tree.ancestors[i], schema);
      const parent = getParentInternal(tree.ancestors[i], schema);
      // only compare to the parent if this is not the last entry in the array
      if (i < tree.ancestors.length - 1) {
        // the current node's parent ID should match the parent's ID field
        expect(parent).to.be(getID(tree.ancestors[i + 1], schema));
        expect(parent).to.not.be(undefined);
        expect(tree.ancestors[i].parent).to.not.be(undefined);
        expect(tree.ancestors[i].parent).to.be(parent);
      }
      // the current node's ID must exist in the generated tree
      expect(allGenNodes.get(String(id))?.id).to.be(id);
      expect(tree.ancestors[i].id).to.be(id);
    }
  }
};

const verifyChildren = ({
  responseTrees,
  schema,
  genTree,
}: {
  responseTrees: APIResponse;
  schema: ResolverSchema;
  genTree: Tree;
}) => {
  const allGenNodes = new Map<string, TreeNode>([
    ...genTree.ancestry,
    ...genTree.children,
    [genTree.origin.id, genTree.origin],
  ]);
  for (const tree of responseTrees.trees.values()) {
    if (tree.nodeExpectations.descendantLevels !== undefined) {
      expect(tree.nodeExpectations.descendantLevels).to.be(tree.descendantLevels.length);
    }
    let totalDescendants = 0;

    for (const level of tree.descendantLevels) {
      for (const node of level.values()) {
        totalDescendants += 1;
        const id = getID(node, schema);
        const parent = getParent(node, schema);
        const genNode = allGenNodes.get(String(id));
        expect(id).to.be(node.id);
        expect(parent).to.be(node.parent);
        expect(node.parent).to.not.be(undefined);
        // make sure the id field is the same in the returned node as the generated one
        expect(id).to.be(entityIDSafeVersion(genNode!.lifecycle[0]));
        // make sure the parent field is the same in the returned node as the generated one
        expect(parent).to.be(parentEntityIDSafeVersion(genNode!.lifecycle[0]));
      }
    }
    if (tree.nodeExpectations.descendants !== undefined) {
      expect(tree.nodeExpectations.descendants).to.be(totalDescendants);
    }
  }
};

const verifyStats = ({
  responseTrees,
  relatedEventsCategories,
}: {
  responseTrees: APIResponse;
  relatedEventsCategories: RelatedEventInfo[];
}) => {
  for (const node of responseTrees.allNodes) {
    let totalExpEvents = 0;
    for (const cat of relatedEventsCategories) {
      const ecsCategories = categoryMapping[cat.category];
      if (Array.isArray(ecsCategories)) {
        // if there are multiple ecs categories used to define a related event, the count for all of them should be the same
        // and they should equal what is defined in the categories used to generate the related events
        for (const ecsCat of ecsCategories) {
          expect(node.stats.byCategory[ecsCat]).to.be(cat.count);
        }
      } else {
        expect(node.stats.byCategory[ecsCategories]).to.be(cat.count);
      }

      totalExpEvents += cat.count;
    }
    expect(node.stats.total).to.be(totalExpEvents);
  }
};

/**
 * Verify the ancestry of multiple trees.
 *
 * @param expectations array of expectations based on the origin that built a particular tree
 * @param response the nodes returned from the api
 * @param schema the schema fields passed to the tree api
 * @param genTree the generated tree that was inserted in Elasticsearch that we are querying
 * @param relatedEventsCategories an optional array to instruct the verification to check the stats
 *  on each node returned
 */
export const verifyTree = ({
  expectations,
  response,
  schema,
  genTree,
  relatedEventsCategories,
}: {
  expectations: TreeExpectation[];
  response: ResolverNode[];
  schema: ResolverSchema;
  genTree: Tree;
  relatedEventsCategories?: RelatedEventInfo[];
}) => {
  const responseTrees = createTreeFromResponse(expectations, response, schema);
  verifyAncestry({ responseTrees, schema, genTree });
  verifyChildren({ responseTrees, schema, genTree });
  if (relatedEventsCategories !== undefined) {
    verifyStats({ responseTrees, relatedEventsCategories });
  }
};

/**
 * Creates the ancestry array based on an array of events. The order of the ancestry array will match the order
 * of the events passed in.
 *
 * @param events an array of generated events
 */
export const createAncestryArray = (events: Event[]) => {
  const ancestry: string[] = [];
  for (const event of events) {
    const entityID = entityIDSafeVersion(event);
    if (entityID) {
      ancestry.push(entityID);
    }
  }
  return ancestry;
};

/**
 * Compare an array of events returned from an API with an array of events generated
 *
 * @param expected an array to use as the source of truth
 * @param toTest the array to test against the source of truth
 * @param lengthCheck an optional flag to check that the arrays are the same length
 */
export const compareArrays = (
  expected: Event[],
  toTest: SafeResolverEvent[],
  lengthCheck: boolean = false
) => {
  if (lengthCheck) {
    expect(expected.length).to.eql(toTest.length);
  }

  toTest.forEach((toTestEvent) => {
    expect(
      expected.find((arrEvent) => {
        // we're only checking that the event ids are the same here. The reason we can't check the entire document
        // is because ingest pipelines are used to add fields to the document when it is received by elasticsearch,
        // therefore it will not be the same as the document created by the generator
        return eventIDSafeVersion(toTestEvent) === eventIDSafeVersion(arrEvent);
      })
    ).to.be.ok();
  });
};
