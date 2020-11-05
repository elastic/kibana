/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import {
  NodeID,
  Schema,
} from '../../../../plugins/security_solution/server/endpoint/routes/resolver/new_tree/utils';
import {
  SafeResolverAncestry,
  SafeResolverChildren,
  SafeResolverTree,
  SafeLegacyEndpointEvent,
  ResolverNode,
} from '../../../../plugins/security_solution/common/endpoint/types';
import {
  parentEntityIDSafeVersion,
  timestampSafeVersion,
} from '../../../../plugins/security_solution/common/endpoint/models/event';
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
  verifyAncestry2,
} from './common';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
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

  const schemaWithAncestry: Schema = {
    ancestry: 'process.Ext.ancestry',
    id: 'process.entity_id',
    parent: 'process.parent.entity_id',
  };

  const schemaWithoutAncestry: Schema = {
    id: 'process.entity_id',
    parent: 'process.parent.entity_id',
  };

  const createTreeBody = ({
    descendants,
    descendantLevels,
    ancestors,
    schema,
    nodes,
    from,
    to,
  }: {
    descendants: number;
    descendantLevels: number;
    ancestors: number;
    schema: Schema;
    nodes: NodeID[];
    from: Date;
    to: Date;
  }) => {
    return {
      descendantLevels,
      descendants,
      ancestors,
      timerange: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      schema,
      nodes,
      indexPatterns: ['logs-*'],
    };
  };

  describe('Resolver tree', () => {
    before(async () => {
      resolverTrees = await resolver.createTrees(treeOptions);
      // we only requested a single alert so there's only 1 tree
      tree = resolverTrees.trees[0];
    });
    after(async () => {
      await resolver.deleteData(resolverTrees);
    });

    describe('ancestry events route', () => {
      it('should the correct ancestor nodes for the tree', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send(
            createTreeBody({
              descendants: 0,
              descendantLevels: 0,
              ancestors: 9,
              schema: schemaWithAncestry,
              nodes: [tree.origin.id],
              from: tree.startTime,
              to: tree.endTime,
            })
          )
          .expect(200);
        verifyAncestry2({
          ancestors: 5,
          origins: [tree.origin.id],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
        });
      });

      it('should handle an invalid id', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send(
            createTreeBody({
              descendants: 0,
              descendantLevels: 0,
              ancestors: 9,
              schema: schemaWithAncestry,
              nodes: ['bogus id'],
              from: tree.startTime,
              to: tree.endTime,
            })
          )
          .expect(200);
        expect(body).to.be.empty();
      });

      it('should return a subset of the ancestors', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send(
            createTreeBody({
              descendants: 0,
              descendantLevels: 0,
              // 3 ancestors means 1 origin and 2 ancestors of the origin
              ancestors: 3,
              schema: schemaWithAncestry,
              nodes: [tree.origin.id],
              from: tree.startTime,
              to: tree.endTime,
            })
          )
          .expect(200);
        verifyAncestry2({
          ancestors: 2,
          origins: [tree.origin.id],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
        });
      });

      it('should return ancestors without the ancestry array', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send(
            createTreeBody({
              descendants: 0,
              descendantLevels: 0,
              ancestors: 50,
              schema: schemaWithoutAncestry,
              nodes: [tree.origin.id],
              from: tree.startTime,
              to: tree.endTime,
            })
          )
          .expect(200);
        verifyAncestry2({
          ancestors: 5,
          origins: [tree.origin.id],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      it('should respect the time range specified and only return the origin node', async () => {
        const from = new Date(timestampSafeVersion(tree.origin.lifecycle[0]) ?? new Date());
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send(
            createTreeBody({
              descendants: 0,
              descendantLevels: 0,
              ancestors: 50,
              schema: schemaWithoutAncestry,
              nodes: [tree.origin.id],
              from,
              to: from,
            })
          )
          .expect(200);
        verifyAncestry2({
          ancestors: 0,
          origins: [tree.origin.id],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      // TODO tests for multiple nodes in a single request
    });

    describe('children route', () => {
      describe('endpoint events', () => {
        it('returns all children for the origin', async () => {
          const { body }: { body: SafeResolverChildren } = await supertest
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
          const { body }: { body: SafeResolverChildren } = await supertest
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
          let { body }: { body: SafeResolverChildren } = await supertest
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
          let { body }: { body: SafeResolverChildren } = await supertest
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
      describe('endpoint events', () => {
        it('returns a tree', async () => {
          const { body }: { body: SafeResolverTree } = await supertest
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

          expect(body.relatedAlerts.nextAlert).to.equal(null);
          compareArrays(tree.origin.relatedAlerts, body.relatedAlerts.alerts, true);

          compareArrays(tree.origin.lifecycle, body.lifecycle, true);
          verifyStats(body.stats, relatedEventsToGen, relatedAlerts);
        });
      });
    });
  });
}
