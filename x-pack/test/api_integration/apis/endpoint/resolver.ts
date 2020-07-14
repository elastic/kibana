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
  ResolverAncestry,
  ResolverEvent,
  ResolverRelatedEvents,
  ResolverChildren,
  ResolverTree,
  LegacyEndpointEvent,
  ResolverNodeStats,
  ResolverRelatedAlerts,
} from '../../../../plugins/security_solution/common/endpoint/types';
import { parentEntityId } from '../../../../plugins/security_solution/common/endpoint/models/event';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  Event,
  Tree,
  TreeNode,
  RelatedEventCategory,
  RelatedEventInfo,
  categoryMapping,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';
import { Options, GeneratedTrees } from '../../services/resolver';

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
const verifyAncestry = (
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
const retrieveDistantAncestor = (ancestors: ResolverLifecycleNode[]) => {
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
const verifyChildren = (
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
const compareArrays = (
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
        return JSON.stringify(arrEvent) === JSON.stringify(toTestEvent);
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
const verifyStats = (
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
const verifyLifecycleStats = (
  nodes: ResolverLifecycleNode[],
  categories: RelatedEventInfo[],
  relatedAlerts: number
) => {
  for (const node of nodes) {
    verifyStats(node.stats, categories, relatedAlerts);
  }
};

export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const resolver = getService('resolverGenerator');

  const relatedEventsToGen = [
    { category: RelatedEventCategory.Driver, count: 2 },
    { category: RelatedEventCategory.File, count: 1 },
    { category: RelatedEventCategory.Registry, count: 1 },
  ];
  const relatedAlerts = 4;
  let resolverTrees: GeneratedTrees;
  let tree: Tree;
  const treeOptions: Options = {
    ancestors: 5,
    relatedEvents: relatedEventsToGen,
    relatedAlerts,
    children: 3,
    generations: 2,
    percentTerminated: 100,
    percentWithRelated: 100,
    numTrees: 1,
    alwaysGenMaxChildrenPerNode: true,
    ancestryArraySize: 2,
  };

  describe('Resolver', () => {
    before(async () => {
      await esArchiver.load('endpoint/resolver/api_feature');
      resolverTrees = await resolver.createTrees(treeOptions);
      // we only requested a single alert so there's only 1 tree
      tree = resolverTrees.trees[0];
    });
    after(async () => {
      await resolver.deleteTrees(resolverTrees);
      // this unload is for an endgame-* index so it does not use data streams
      await esArchiver.unload('endpoint/resolver/api_feature');
    });

    describe('related alerts route', () => {
      describe('endpoint events', () => {
        it('should not find any alerts', async () => {
          const { body }: { body: ResolverRelatedAlerts } = await supertest
            .get(`/api/endpoint/resolver/5555/alerts`)
            .expect(200);
          expect(body.nextAlert).to.eql(null);
          expect(body.alerts).to.be.empty();
        });

        it('should return details for the root node', async () => {
          const { body }: { body: ResolverRelatedAlerts } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/alerts`)
            .expect(200);
          expect(body.alerts.length).to.eql(4);
          compareArrays(tree.origin.relatedAlerts, body.alerts, true);
          expect(body.nextAlert).to.eql(null);
        });

        it('should return paginated results for the root node', async () => {
          let { body }: { body: ResolverRelatedAlerts } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/alerts?alerts=2`)
            .expect(200);
          expect(body.alerts.length).to.eql(2);
          compareArrays(tree.origin.relatedAlerts, body.alerts);
          expect(body.nextAlert).not.to.eql(null);

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${tree.origin.id}/alerts?alerts=2&afterAlert=${body.nextAlert}`
            )
            .expect(200));
          expect(body.alerts.length).to.eql(2);
          compareArrays(tree.origin.relatedAlerts, body.alerts);
          expect(body.nextAlert).to.not.eql(null);

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${tree.origin.id}/alerts?alerts=2&afterAlert=${body.nextAlert}`
            )
            .expect(200));
          expect(body.alerts).to.be.empty();
          expect(body.nextAlert).to.eql(null);
        });

        it('should return the first page of information when the cursor is invalid', async () => {
          const { body }: { body: ResolverRelatedAlerts } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/alerts?afterAlert=blah`)
            .expect(200);
          expect(body.alerts.length).to.eql(4);
          compareArrays(tree.origin.relatedAlerts, body.alerts, true);
          expect(body.nextAlert).to.eql(null);
        });
      });
    });

    describe('related events route', () => {
      describe('legacy events', () => {
        const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
        const entityID = '94042';
        const cursor = 'eyJ0aW1lc3RhbXAiOjE1ODE0NTYyNTUwMDAsImV2ZW50SUQiOiI5NDA0MyJ9';

        it('should return details for the root node', async () => {
          const { body }: { body: ResolverRelatedEvents } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}`)
            .expect(200);
          expect(body.events.length).to.eql(1);
          expect(body.entityID).to.eql(entityID);
          expect(body.nextEvent).to.eql(null);
        });

        it('returns no values when there is no more data', async () => {
          const { body }: { body: ResolverRelatedEvents } = await supertest
            // after is set to the document id of the last event so there shouldn't be any more after it
            .get(
              `/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}&afterEvent=${cursor}`
            )
            .expect(200);
          expect(body.events).be.empty();
          expect(body.entityID).to.eql(entityID);
          expect(body.nextEvent).to.eql(null);
        });

        it('should return the first page of information when the cursor is invalid', async () => {
          const { body }: { body: ResolverRelatedEvents } = await supertest
            .get(
              `/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}&afterEvent=blah`
            )
            .expect(200);
          expect(body.entityID).to.eql(entityID);
          expect(body.nextEvent).to.eql(null);
        });

        it('should return no results for an invalid endpoint ID', async () => {
          const { body }: { body: ResolverRelatedEvents } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/events?legacyEndpointID=foo`)
            .expect(200);
          expect(body.nextEvent).to.eql(null);
          expect(body.entityID).to.eql(entityID);
          expect(body.events).to.be.empty();
        });

        it('should error on invalid pagination values', async () => {
          await supertest.get(`/api/endpoint/resolver/${entityID}/events?events=0`).expect(400);
          await supertest.get(`/api/endpoint/resolver/${entityID}/events?events=20000`).expect(400);
          await supertest.get(`/api/endpoint/resolver/${entityID}/events?events=-1`).expect(400);
        });
      });

      describe('endpoint events', () => {
        it('should not find any events', async () => {
          const { body }: { body: ResolverRelatedEvents } = await supertest
            .get(`/api/endpoint/resolver/5555/events`)
            .expect(200);
          expect(body.nextEvent).to.eql(null);
          expect(body.events).to.be.empty();
        });

        it('should return details for the root node', async () => {
          const { body }: { body: ResolverRelatedEvents } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/events`)
            .expect(200);
          expect(body.events.length).to.eql(4);
          compareArrays(tree.origin.relatedEvents, body.events, true);
          expect(body.nextEvent).to.eql(null);
        });

        it('should return paginated results for the root node', async () => {
          let { body }: { body: ResolverRelatedEvents } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/events?events=2`)
            .expect(200);
          expect(body.events.length).to.eql(2);
          compareArrays(tree.origin.relatedEvents, body.events);
          expect(body.nextEvent).not.to.eql(null);

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${tree.origin.id}/events?events=2&afterEvent=${body.nextEvent}`
            )
            .expect(200));
          expect(body.events.length).to.eql(2);
          compareArrays(tree.origin.relatedEvents, body.events);
          expect(body.nextEvent).to.not.eql(null);

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${tree.origin.id}/events?events=2&afterEvent=${body.nextEvent}`
            )
            .expect(200));
          expect(body.events).to.be.empty();
          expect(body.nextEvent).to.eql(null);
        });

        it('should return the first page of information when the cursor is invalid', async () => {
          const { body }: { body: ResolverRelatedEvents } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/events?afterEvent=blah`)
            .expect(200);
          expect(body.events.length).to.eql(4);
          compareArrays(tree.origin.relatedEvents, body.events, true);
          expect(body.nextEvent).to.eql(null);
        });
      });
    });

    describe('ancestry events route', () => {
      describe('legacy events', () => {
        const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
        const entityID = '94042';

        it('should return details for the root node', async () => {
          const { body }: { body: ResolverAncestry } = await supertest
            .get(
              `/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}&ancestors=5`
            )
            .expect(200);
          expect(body.ancestors[0].lifecycle.length).to.eql(2);
          expect(body.ancestors.length).to.eql(2);
          expect(body.nextAncestor).to.eql(null);
        });

        it('should have a populated next parameter', async () => {
          const { body }: { body: ResolverAncestry } = await supertest
            .get(
              `/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}&ancestors=0`
            )
            .expect(200);
          expect(body.nextAncestor).to.eql('94041');
        });

        it('should handle an ancestors param request', async () => {
          let { body }: { body: ResolverAncestry } = await supertest
            .get(
              `/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}&ancestors=0`
            )
            .expect(200);
          const next = body.nextAncestor;

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${next}/ancestry?legacyEndpointID=${endpointID}&ancestors=1`
            )
            .expect(200));
          expect(body.ancestors[0].lifecycle.length).to.eql(1);
          expect(body.nextAncestor).to.eql(null);
        });
      });

      describe('endpoint events', () => {
        it('should return the origin node at the front of the array', async () => {
          const { body }: { body: ResolverAncestry } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/ancestry?ancestors=9`)
            .expect(200);
          expect(body.ancestors[0].entityID).to.eql(tree.origin.id);
        });

        it('should return details for the root node', async () => {
          const { body }: { body: ResolverAncestry } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/ancestry?ancestors=9`)
            .expect(200);
          // the tree we generated had 5 ancestors + 1 origin node
          expect(body.ancestors.length).to.eql(6);
          expect(body.ancestors[0].entityID).to.eql(tree.origin.id);
          verifyAncestry(body.ancestors, tree, true);
          expect(body.nextAncestor).to.eql(null);
        });

        it('should handle an invalid id', async () => {
          const { body }: { body: ResolverAncestry } = await supertest
            .get(`/api/endpoint/resolver/alskdjflasj/ancestry`)
            .expect(200);
          expect(body.ancestors).to.be.empty();
          expect(body.nextAncestor).to.eql(null);
        });

        it('should have a populated next parameter', async () => {
          const { body }: { body: ResolverAncestry } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/ancestry?ancestors=2`)
            .expect(200);
          // it should have 2 ancestors + 1 origin
          expect(body.ancestors.length).to.eql(3);
          verifyAncestry(body.ancestors, tree, false);
          const distantGrandparent = retrieveDistantAncestor(body.ancestors);
          expect(body.nextAncestor).to.eql(parentEntityId(distantGrandparent.lifecycle[0]));
        });

        it('should handle multiple ancestor requests', async () => {
          let { body }: { body: ResolverAncestry } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/ancestry?ancestors=3`)
            .expect(200);
          expect(body.ancestors.length).to.eql(4);
          const next = body.nextAncestor;

          ({ body } = await supertest
            .get(`/api/endpoint/resolver/${next}/ancestry?ancestors=1`)
            .expect(200));
          expect(body.ancestors.length).to.eql(2);
          verifyAncestry(body.ancestors, tree, true);
          // the highest node in the generated tree will not have a parent ID which causes the server to return
          // without setting the pagination so nextAncestor will be null
          expect(body.nextAncestor).to.eql(null);
        });
      });
    });

    describe('children route', () => {
      describe('legacy events', () => {
        const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
        const entityID = '94041';
        const cursor = 'eyJ0aW1lc3RhbXAiOjE1ODE0NTYyNTUwMDAsImV2ZW50SUQiOiI5NDA0MiJ9';

        it('returns child process lifecycle events', async () => {
          const { body }: { body: ResolverChildren } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}`)
            .expect(200);
          expect(body.childNodes.length).to.eql(1);
          expect(body.childNodes[0].lifecycle.length).to.eql(2);
          expect(
            // for some reason the ts server doesn't think `endgame` exists even though we're using ResolverEvent
            // here, so to avoid it complaining we'll just force it
            (body.childNodes[0].lifecycle[0] as LegacyEndpointEvent).endgame.unique_pid
          ).to.eql(94042);
        });

        it('returns multiple levels of child process lifecycle events', async () => {
          const { body }: { body: ResolverChildren } = await supertest
            .get(`/api/endpoint/resolver/93802/children?legacyEndpointID=${endpointID}&children=10`)
            .expect(200);
          expect(body.childNodes.length).to.eql(10);
          expect(body.nextChild).to.be(null);
          expect(body.childNodes[0].lifecycle.length).to.eql(1);
          expect(
            // for some reason the ts server doesn't think `endgame` exists even though we're using ResolverEvent
            // here, so to avoid it complaining we'll just force it
            (body.childNodes[0].lifecycle[0] as LegacyEndpointEvent).endgame.unique_pid
          ).to.eql(93932);
        });

        it('returns no values when there is no more data', async () => {
          const { body } = await supertest
            // after is set to the document id of the last event so there shouldn't be any more after it
            .get(
              `/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}&afterChild=${cursor}`
            )
            .expect(200);
          expect(body.childNodes).be.empty();
          expect(body.nextChild).to.eql(null);
        });

        it('returns the first page of information when the cursor is invalid', async () => {
          const { body }: { body: ResolverChildren } = await supertest
            .get(
              `/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}&afterChild=blah`
            )
            .expect(200);
          expect(body.childNodes.length).to.eql(1);
          expect(body.nextChild).to.be(null);
        });

        it('errors on invalid pagination values', async () => {
          await supertest.get(`/api/endpoint/resolver/${entityID}/children?children=0`).expect(400);
          await supertest
            .get(`/api/endpoint/resolver/${entityID}/children?children=20000`)
            .expect(400);
          await supertest
            .get(`/api/endpoint/resolver/${entityID}/children?children=-1`)
            .expect(400);
        });

        it('returns empty events without a matching entity id', async () => {
          const { body }: { body: ResolverChildren } = await supertest
            .get(`/api/endpoint/resolver/5555/children`)
            .expect(200);
          expect(body.nextChild).to.eql(null);
          expect(body.childNodes).to.be.empty();
        });

        it('returns empty events with an invalid endpoint id', async () => {
          const { body }: { body: ResolverChildren } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/children?legacyEndpointID=foo`)
            .expect(200);
          expect(body.nextChild).to.eql(null);
          expect(body.childNodes).to.be.empty();
        });
      });

      describe('endpoint events', () => {
        it('returns all children for the origin', async () => {
          const { body }: { body: ResolverChildren } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/children?children=100`)
            .expect(200);
          // there are 2 levels in the children part of the tree and 3 nodes for each =
          // 3 children for the origin + 3 children for each of the origin's children = 12
          expect(body.childNodes.length).to.eql(12);
          // there will be 4 parents, the origin of the tree, and it's 3 children
          verifyChildren(body.childNodes, tree, 4, 3);
          expect(body.nextChild).to.eql(null);
        });

        it('returns a single generation of children', async () => {
          // this gets a node should have 3 children which were created in succession so that the timestamps
          // are ordered correctly to be retrieved in a single call
          const distantChildEntityID = Array.from(tree.childrenLevels[0].values())[0].id;
          const { body }: { body: ResolverChildren } = await supertest
            .get(`/api/endpoint/resolver/${distantChildEntityID}/children?children=3`)
            .expect(200);
          expect(body.childNodes.length).to.eql(3);
          verifyChildren(body.childNodes, tree, 1, 3);
          expect(body.nextChild).to.not.eql(null);
        });

        it('paginates the children', async () => {
          // this gets a node should have 3 children which were created in succession so that the timestamps
          // are ordered correctly to be retrieved in a single call
          const distantChildEntityID = Array.from(tree.childrenLevels[0].values())[0].id;
          let { body }: { body: ResolverChildren } = await supertest
            .get(`/api/endpoint/resolver/${distantChildEntityID}/children?children=1`)
            .expect(200);
          expect(body.childNodes.length).to.eql(1);
          verifyChildren(body.childNodes, tree, 1, 1);
          expect(body.nextChild).to.not.be(null);

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${distantChildEntityID}/children?children=2&afterChild=${body.nextChild}`
            )
            .expect(200));
          expect(body.childNodes.length).to.eql(2);
          verifyChildren(body.childNodes, tree, 1, 2);
          expect(body.nextChild).to.not.be(null);

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${distantChildEntityID}/children?children=2&afterChild=${body.nextChild}`
            )
            .expect(200));
          expect(body.childNodes.length).to.eql(0);
          expect(body.nextChild).to.be(null);
        });

        it('gets all children in two queries', async () => {
          // should get all the children of the origin
          let { body }: { body: ResolverChildren } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/children?children=3`)
            .expect(200);
          expect(body.childNodes.length).to.eql(3);
          verifyChildren(body.childNodes, tree);
          expect(body.nextChild).to.not.be(null);
          const firstNodes = [...body.childNodes];

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${tree.origin.id}/children?children=10&afterChild=${body.nextChild}`
            )
            .expect(200));
          expect(body.childNodes.length).to.eql(9);
          // put all the results together and we should have all the children
          verifyChildren([...firstNodes, ...body.childNodes], tree, 4, 3);
          expect(body.nextChild).to.be(null);
        });
      });
    });

    describe('tree api', () => {
      describe('legacy events', () => {
        const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';

        it('returns ancestors, events, children, and current process lifecycle', async () => {
          const { body }: { body: ResolverTree } = await supertest
            .get(`/api/endpoint/resolver/93933?legacyEndpointID=${endpointID}`)
            .expect(200);
          expect(body.ancestry.nextAncestor).to.equal(null);
          expect(body.relatedEvents.nextEvent).to.equal(null);
          expect(body.children.nextChild).to.equal(null);
          expect(body.children.childNodes.length).to.equal(0);
          expect(body.relatedEvents.events.length).to.equal(0);
          expect(body.lifecycle.length).to.equal(2);
        });
      });

      describe('endpoint events', () => {
        it('returns a tree', async () => {
          const { body }: { body: ResolverTree } = await supertest
            .get(
              `/api/endpoint/resolver/${tree.origin.id}?children=100&ancestors=5&events=5&alerts=5`
            )
            .expect(200);

          expect(body.children.nextChild).to.equal(null);
          expect(body.children.childNodes.length).to.equal(12);
          verifyChildren(body.children.childNodes, tree, 4, 3);
          verifyLifecycleStats(body.children.childNodes, relatedEventsToGen, relatedAlerts);

          expect(body.ancestry.nextAncestor).to.equal(null);
          verifyAncestry(body.ancestry.ancestors, tree, true);
          verifyLifecycleStats(body.ancestry.ancestors, relatedEventsToGen, relatedAlerts);

          expect(body.relatedEvents.nextEvent).to.equal(null);
          compareArrays(tree.origin.relatedEvents, body.relatedEvents.events, true);

          expect(body.relatedAlerts.nextAlert).to.equal(null);
          compareArrays(tree.origin.relatedAlerts, body.relatedAlerts.alerts, true);

          compareArrays(tree.origin.lifecycle, body.lifecycle, true);
          verifyStats(body.stats, relatedEventsToGen, relatedAlerts);
        });
      });
    });
  });
}
