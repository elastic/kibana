/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import {
  ResolverAncestry,
  ResolverChildren,
  ResolverTree,
  LegacyEndpointEvent,
} from '../../../../plugins/security_solution/common/endpoint/types';
import { parentEntityId } from '../../../../plugins/security_solution/common/endpoint/models/event';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  Tree,
  RelatedEventCategory,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';
import { Options, GeneratedTrees } from '../../services/resolver';
import {
  compareArrays,
  verifyAncestry,
  retrieveDistantAncestor,
  verifyChildren,
  verifyLifecycleStats,
  verifyStats,
} from './common';

export default function ({ getService }: FtrProviderContext) {
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

  describe('Resolver tree', () => {
    before(async () => {
      await esArchiver.load('endpoint/resolver/api_feature');
      resolverTrees = await resolver.createTrees(treeOptions);
      // we only requested a single alert so there's only 1 tree
      tree = resolverTrees.trees[0];
    });
    after(async () => {
      await resolver.deleteData(resolverTrees);
      // this unload is for an endgame-* index so it does not use data streams
      await esArchiver.unload('endpoint/resolver/api_feature');
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
          let { body }: { body: ResolverChildren } = await supertest
            .get(
              // there should only be a single child for this node
              `/api/endpoint/resolver/94041/children?legacyEndpointID=${endpointID}&children=1`
            )
            .expect(200);
          expect(body.nextChild).to.not.be(null);

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/94041/children?legacyEndpointID=${endpointID}&afterChild=${body.nextChild}`
            )
            .expect(200));
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
