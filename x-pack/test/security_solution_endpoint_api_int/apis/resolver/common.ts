/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import expect from '@kbn/expect';
import {
  ResolverChildNode,
  ResolverLifecycleNode,
  ResolverEvent,
  ResolverNodeStats,
} from '../../../../plugins/security_solution/common/endpoint/types';
import {
  parentEntityId,
  eventId,
} from '../../../../plugins/security_solution/common/endpoint/models/event';
import {
  Event,
  Tree,
  TreeNode,
  RelatedEventInfo,
  categoryMapping,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';

/**
 * Check that the given lifecycle is in the resolver tree's corresponding map
 *
 * @param node a lifecycle node containing the start and end events for a node
 * @param nodeMap a map of entity_ids to nodes to look for the passed in `node`
 */
const expectLifecycleNodeInMap = (node: ResolverLifecycleNode, nodeMap: Map<string, TreeNode>) => {
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
  ancestors: ResolverLifecycleNode[],
  tree: Tree,
  verifyLastParent: boolean
) => {
  // group the ancestors by their entity_id mapped to a lifecycle node
  const groupedAncestors = _.groupBy(ancestors, (ancestor) => ancestor.entityID);
  // group by parent entity_id
  const groupedAncestorsParent = _.groupBy(ancestors, (ancestor) =>
    parentEntityId(ancestor.lifecycle[0])
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
    const parentID = parentEntityId(node.lifecycle[0]);
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
export const retrieveDistantAncestor = (ancestors: ResolverLifecycleNode[]) => {
  // group the ancestors by their entity_id mapped to a lifecycle node
  const groupedAncestors = _.groupBy(ancestors, (ancestor) => ancestor.entityID);
  let node = ancestors[0];
  for (let i = 0; i < ancestors.length; i++) {
    const parentID = parentEntityId(node.lifecycle[0]);
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
  children: ResolverChildNode[],
  tree: Tree,
  numberOfParents?: number,
  childrenPerParent?: number
) => {
  // group the children by their entity_id mapped to a child node
  const groupedChildren = _.groupBy(children, (child) => child.entityID);
  // make sure each child is unique
  expect(Object.keys(groupedChildren).length).to.eql(children.length);
  if (numberOfParents !== undefined) {
    const groupParent = _.groupBy(children, (child) => parentEntityId(child.lifecycle[0]));
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
  toTest: ResolverEvent[],
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
        return eventId(toTestEvent) === eventId(arrEvent);
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
  nodes: ResolverLifecycleNode[],
  categories: RelatedEventInfo[],
  relatedAlerts: number
) => {
  for (const node of nodes) {
    verifyStats(node.stats, categories, relatedAlerts);
  }
};
