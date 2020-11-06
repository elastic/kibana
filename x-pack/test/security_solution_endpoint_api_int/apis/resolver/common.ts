/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import expect from '@kbn/expect';
import {
  NodeID,
  Schema,
} from '../../../../plugins/security_solution/server/endpoint/routes/resolver/new_tree/utils';
import {
  SafeResolverChildNode,
  SafeResolverLifecycleNode,
  SafeResolverEvent,
  ResolverNodeStats,
  ResolverNode,
} from '../../../../plugins/security_solution/common/endpoint/types';
import {
  parentEntityIDSafeVersion,
  entityIDSafeVersion,
  eventIDSafeVersion,
  timestampSafeVersion,
} from '../../../../plugins/security_solution/common/endpoint/models/event';
import {
  Event,
  Tree,
  TreeNode,
  RelatedEventInfo,
  categoryMapping,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';

const createLevels = (
  descendantsByParent: Map<NodeID, Map<NodeID, ResolverNode>>,
  levels: Array<Map<NodeID, ResolverNode>>,
  currentNodes: Map<NodeID, ResolverNode> | undefined,
  schema: Schema
): Array<Map<NodeID, ResolverNode>> => {
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
  return createLevels(descendantsByParent, levels, nextLevel, schema);
};

interface APITree {
  // entries closer to the beginning of the array are more direct parents of the origin aka
  // ancestors[0] = the origin's parent, ancestors[1] = the origin's grandparent
  ancestors: ResolverNode[];
  origin: ResolverNode;
  descendantLevels: Array<Map<NodeID, ResolverNode>>;
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
export const getID = (node: ResolverNode, schema: Schema): NodeID => {
  const id = _.get(node.data, schema.id);
  if (!id) {
    throw new Error(`Unable to find id ${schema.id} in node: ${JSON.stringify(node)}`);
  }
  return id;
};

const getParentInternal = (node: ResolverNode | undefined, schema: Schema): NodeID | undefined => {
  if (node) {
    return _.get(node.data, schema.parent);
  }
  return undefined;
};

/**
 * Gets the parent ID field from a resolver node. Throws an error if the ID doesn't exist.
 *
 * @param node a resolver node
 * @param schema the schema that was used to retrieve this resolver node
 */
export const getParent = (node: ResolverNode, schema: Schema): NodeID => {
  const parent = getParentInternal(node, schema);
  if (!parent) {
    throw new Error(`Unable to find parent ${schema.parent} in node: ${JSON.stringify(node)}`);
  }
  return parent;
};

/**
 * Reformats the tree's response to make it easier to perform testing on the results.
 *
 * @param origins the node IDs used to retrieve the trees
 * @param nodes the response from the tree api
 * @param schema the schema used when calling the tree api
 */
export const createTreeFromResponse = (
  origins: NodeID[],
  nodes: ResolverNode[],
  schema: Schema
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

  for (const origin of origins) {
    const descendantLevels = createLevels(nodesByParent, [], nodesByParent.get(origin), schema);
    const originNode = nodesByID.get(origin);
    if (!originNode) {
      throw new Error(`Unable to find origin for id: ${origin}`);
    }

    let currentID: NodeID | undefined = getParentInternal(originNode, schema);
    const ancestors: ResolverNode[] = [];
    while (currentID !== undefined) {
      const parentNode = nodesByID.get(currentID);
      if (parentNode) {
        ancestors.push(parentNode);
      }
      currentID = getParentInternal(parentNode, schema);
    }

    trees.set(origin, {
      ancestors,
      origin: originNode,
      descendantLevels,
    });
  }

  return {
    nodesByID,
    trees,
    allNodes: nodes,
  };
};

const verifyAncestryInternal = ({
  responseTrees,
  schema,
  genTree,
  ancestors,
}: {
  responseTrees: APIResponse;
  schema: Schema;
  genTree: Tree;
  ancestors: number;
}) => {
  for (const tree of responseTrees.trees.values()) {
    expect(tree.ancestors.length).to.be(ancestors);
    expect(getID(tree.origin, schema)).to.be(genTree.origin.id);
    expect(getParent(tree.origin, schema)).to.be(
      parentEntityIDSafeVersion(genTree.origin.lifecycle[0])
    );
    const originLifecycleSorted = [...genTree.origin.lifecycle].sort((a: Event, b: Event) => {
      const aTime: number | undefined = timestampSafeVersion(a);
      const bTime = timestampSafeVersion(b);
      if (aTime !== undefined && bTime !== undefined) {
        return aTime - bTime;
      } else {
        return 0;
      }
    });

    expect(_.get(tree.origin.data, '@timestamp')).to.be(
      timestampSafeVersion(originLifecycleSorted[0])
    );
    for (let i = 0; i < tree.ancestors.length; i++) {
      const id = getID(tree.ancestors[i], schema);
      const parent = getParentInternal(tree.ancestors[i], schema);
      // only compare to the parent if this is not the last entry in the array
      if (i < tree.ancestors.length - 1) {
        // the current node's parent ID should match the parent's ID field
        expect(parent).to.be(getID(tree.ancestors[i + 1], schema));
      }
      // the current node's ID must exist in the generated tree
      expect(genTree.ancestry.get(String(id))).to.not.be(undefined);
      expect(genTree.ancestry.get(String(id))?.id).to.be(id);
    }
  }
};

/**
 * Verify the ancestry of multiple trees.
 *
 * @param origins the IDs passed to the tree api for getting the trees
 * @param response the nodes returned from the api
 * @param schema the schema fields passed to the tree api
 * @param genTree the generated tree that was inserted in Elasticsearch that we are querying
 * @param ancestors the number of ancestors that we expect to be returned
 */
export const verifyAncestry2 = ({
  origins,
  response,
  schema,
  genTree,
  ancestors,
}: {
  origins: NodeID[];
  response: ResolverNode[];
  schema: Schema;
  genTree: Tree;
  ancestors: number;
}) => {
  const responseTrees = createTreeFromResponse(origins, response, schema);
  verifyAncestryInternal({ responseTrees, schema, genTree, ancestors });
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
 * Check that the given lifecycle is in the resolver tree's corresponding map
 *
 * @param node a lifecycle node containing the start and end events for a node
 * @param nodeMap a map of entity_ids to nodes to look for the passed in `node`
 */
const expectLifecycleNodeInMap = (
  node: SafeResolverLifecycleNode,
  nodeMap: Map<string, TreeNode>
) => {
  const genNode = nodeMap.get(node.entityID);
  expect(genNode).to.be.ok();
  compareArrays(genNode!.lifecycle, node.lifecycle, true);
};

/**
 * Verify that all the ancestor nodes are valid and optionally have parents.
 *
 * @param ancestors an array of ancestors
 * @param tree the generated resolver tree as the source of truth
 * @param verifyLastParent a boolean indicating whether to check the last ancestor. If the ancestors array intentionally
 *  does not contain all the ancestors, the last one will not have the parent
 */
export const verifyAncestry = (
  ancestors: SafeResolverLifecycleNode[],
  tree: Tree,
  verifyLastParent: boolean
) => {
  // group the ancestors by their entity_id mapped to a lifecycle node
  const groupedAncestors = _.groupBy(ancestors, (ancestor) => ancestor.entityID);
  // group by parent entity_id
  const groupedAncestorsParent = _.groupBy(ancestors, (ancestor) =>
    parentEntityIDSafeVersion(ancestor.lifecycle[0])
  );
  // make sure there aren't any nodes with the same entity_id
  expect(Object.keys(groupedAncestors).length).to.eql(ancestors.length);
  // make sure there aren't any nodes with the same parent entity_id
  expect(Object.keys(groupedAncestorsParent).length).to.eql(ancestors.length);

  // make sure each of the ancestors' lifecycle events are in the generated tree
  for (const node of ancestors) {
    expectLifecycleNodeInMap(node, tree.ancestry);
  }

  // start at the origin which is always the first element of the array and make sure we have a connection
  // using parent id between each of the nodes
  let foundParents = 0;
  let node = ancestors[0];
  for (let i = 0; i < ancestors.length; i++) {
    const parentID = parentEntityIDSafeVersion(node.lifecycle[0]);
    if (parentID !== undefined) {
      const nextNode = groupedAncestors[parentID];
      if (!nextNode) {
        break;
      }
      // the grouped nodes should only have a single entry since each entity is unique
      node = nextNode[0];
    }
    foundParents++;
  }

  if (verifyLastParent) {
    expect(foundParents).to.eql(ancestors.length);
  } else {
    // if we only retrieved a portion of all the ancestors then the most distant grandparent's parent will not necessarily
    // be in the results
    expect(foundParents).to.eql(ancestors.length - 1);
  }
};

/**
 * Retrieves the most distant ancestor in the given array.
 *
 * @param ancestors an array of ancestor nodes
 */
export const retrieveDistantAncestor = (ancestors: SafeResolverLifecycleNode[]) => {
  // group the ancestors by their entity_id mapped to a lifecycle node
  const groupedAncestors = _.groupBy(ancestors, (ancestor) => ancestor.entityID);
  let node = ancestors[0];
  for (let i = 0; i < ancestors.length; i++) {
    const parentID = parentEntityIDSafeVersion(node.lifecycle[0]);
    if (parentID !== undefined) {
      const nextNode = groupedAncestors[parentID];
      if (nextNode) {
        node = nextNode[0];
      } else {
        return node;
      }
    }
  }
  return node;
};

/**
 * Verify that the children nodes are correct
 *
 * @param children the children nodes
 * @param tree the generated resolver tree as the source of truth
 * @param numberOfParents an optional number to compare that are a certain number of parents in the children array
 * @param childrenPerParent an optional number to compare that there are a certain number of children for each parent
 */
export const verifyChildren = (
  children: SafeResolverChildNode[],
  tree: Tree,
  numberOfParents?: number,
  childrenPerParent?: number
) => {
  // group the children by their entity_id mapped to a child node
  const groupedChildren = _.groupBy(children, (child) => child.entityID);
  // make sure each child is unique
  expect(Object.keys(groupedChildren).length).to.eql(children.length);
  if (numberOfParents !== undefined) {
    const groupParent = _.groupBy(children, (child) =>
      parentEntityIDSafeVersion(child.lifecycle[0])
    );
    expect(Object.keys(groupParent).length).to.eql(numberOfParents);
    if (childrenPerParent !== undefined) {
      Object.values(groupParent).forEach((childNodes) =>
        expect(childNodes.length).to.be(childrenPerParent)
      );
    }
  }

  children.forEach((child) => {
    expectLifecycleNodeInMap(child, tree.children);
  });
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

/**
 * Verifies that the stats received from ES for a node reflect the categories of events that the generator created.
 *
 * @param relatedEvents the related events received for a particular node
 * @param categories the related event info used when generating the resolver tree
 */
export const verifyStats = (
  stats: ResolverNodeStats | undefined,
  categories: RelatedEventInfo[],
  relatedAlerts: number
) => {
  expect(stats).to.not.be(undefined);
  let totalExpEvents = 0;
  for (const cat of categories) {
    const ecsCategories = categoryMapping[cat.category];
    if (Array.isArray(ecsCategories)) {
      // if there are multiple ecs categories used to define a related event, the count for all of them should be the same
      // and they should equal what is defined in the categories used to generate the related events
      for (const ecsCat of ecsCategories) {
        expect(stats?.events.byCategory[ecsCat]).to.be(cat.count);
      }
    } else {
      expect(stats?.events.byCategory[ecsCategories]).to.be(cat.count);
    }

    totalExpEvents += cat.count;
  }
  expect(stats?.events.total).to.be(totalExpEvents);
  expect(stats?.totalAlerts);
};

/**
 * A helper function for verifying the stats information an array of nodes.
 *
 * @param nodes an array of lifecycle nodes that should have a stats field defined
 * @param categories the related event info used when generating the resolver tree
 */
export const verifyLifecycleStats = (
  nodes: SafeResolverLifecycleNode[],
  categories: RelatedEventInfo[],
  relatedAlerts: number
) => {
  for (const node of nodes) {
    verifyStats(node.stats, categories, relatedAlerts);
  }
};
