/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getNameField } from '@kbn/security-solution-plugin/server/endpoint/routes/resolver/tree/utils/fetch';
import { ResolverNode } from '@kbn/security-solution-plugin/common/endpoint/types';
import {
  parentEntityIDSafeVersion,
  timestampSafeVersion,
} from '@kbn/security-solution-plugin/common/endpoint/models/event';
import {
  Tree,
  RelatedEventCategory,
} from '@kbn/security-solution-plugin/common/endpoint/generate_data';
import { FtrProviderContext } from '../../ftr_provider_context';
import { Options, GeneratedTrees } from '../../services/resolver';
import { schemaWithAncestry, schemaWithName, schemaWithoutAncestry, verifyTree } from './common';

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

  describe('Resolver tree', () => {
    before(async () => {
      resolverTrees = await resolver.createTrees(treeOptions);
      // we only requested a single alert so there's only 1 tree
      tree = resolverTrees.trees[0];
    });
    after(async () => {
      await resolver.deleteData(resolverTrees);
    });

    describe('ancestry events', () => {
      it('should return the correct ancestor nodes for the tree', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            ancestors: 9,
            schema: schemaWithAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [{ origin: tree.origin.id, nodeExpectations: { ancestors: 5 } }],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
        });
      });

      it('should handle an invalid id', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            ancestors: 9,
            schema: schemaWithAncestry,
            nodes: ['bogus id'],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        expect(body).to.be.empty();
      });

      it('should return a subset of the ancestors', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            // 3 ancestors means 1 origin and 2 ancestors of the origin
            ancestors: 3,
            schema: schemaWithAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [{ origin: tree.origin.id, nodeExpectations: { ancestors: 2 } }],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
        });
      });

      it('should return ancestors without the ancestry array', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            ancestors: 50,
            schema: schemaWithoutAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [{ origin: tree.origin.id, nodeExpectations: { ancestors: 5 } }],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      it('should respect the time range specified and only return the origin node', async () => {
        const from = new Date(
          timestampSafeVersion(tree.origin.lifecycle[0]) ?? new Date()
        ).toISOString();
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            ancestors: 50,
            schema: schemaWithoutAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from,
              to: from,
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [{ origin: tree.origin.id, nodeExpectations: { ancestors: 0 } }],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      it('should support returning multiple ancestor trees when multiple nodes are requested', async () => {
        // There should be 2 levels of descendants under the origin, grab the bottom one, and the first node's id
        const bottomMostDescendant = Array.from(tree.childrenLevels[1].values())[0].id;
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            ancestors: 50,
            schema: schemaWithoutAncestry,
            nodes: [tree.origin.id, bottomMostDescendant],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            // there are 5 ancestors above the origin
            { origin: tree.origin.id, nodeExpectations: { ancestors: 5 } },
            // there are 2 levels below the origin so the bottom node's ancestry should be
            // all the ancestors (5) + one level + the origin = 7
            { origin: bottomMostDescendant, nodeExpectations: { ancestors: 7 } },
          ],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      it('should return a single ancestry when two nodes a the same level and from same parent are requested', async () => {
        // there are 2 levels after the origin, let's get the first level, there will be three
        // children so get the left and right most ones
        const level0Nodes = Array.from(tree.childrenLevels[0].values());
        const leftNode = level0Nodes[0].id;
        const rightNode = level0Nodes[2].id;
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            ancestors: 50,
            schema: schemaWithoutAncestry,
            nodes: [leftNode, rightNode],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            // We should be 1 level below the origin so the node's ancestry should be
            // all the ancestors (5) + the origin = 6
            { origin: leftNode, nodeExpectations: { ancestors: 6 } },
            // these nodes should be at the same level so the ancestors should be the same number
            { origin: rightNode, nodeExpectations: { ancestors: 6 } },
          ],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      it('should not return any nodes when the search index does not have any data', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            ancestors: 50,
            schema: schemaWithoutAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['doesnotexist-*'],
          })
          .expect(200);
        expect(body).to.be.empty();
      });
    });

    describe('descendant events', () => {
      it('returns all descendants for the origin without using the ancestry field', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 100,
            descendantLevels: 2,
            ancestors: 0,
            schema: schemaWithoutAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            // there are 2 levels in the descendant part of the tree and 3 nodes for each
            // descendant = 3 children for the origin + 3 children for each of the origin's children = 12
            { origin: tree.origin.id, nodeExpectations: { descendants: 12, descendantLevels: 2 } },
          ],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      it('returns all descendants for the origin using the ancestry field', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 100,
            // should be ignored when using the ancestry array
            descendantLevels: 0,
            ancestors: 0,
            schema: schemaWithAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            // there are 2 levels in the descendant part of the tree and 3 nodes for each
            // descendant = 3 children for the origin + 3 children for each of the origin's children = 12
            { origin: tree.origin.id, nodeExpectations: { descendants: 12, descendantLevels: 2 } },
          ],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
        });
      });

      it('should handle an invalid id', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 100,
            descendantLevels: 100,
            ancestors: 0,
            schema: schemaWithAncestry,
            nodes: ['bogus id'],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        expect(body).to.be.empty();
      });

      it('returns a single generation of children', async () => {
        // this gets a node should have 3 children which were created in succession so that the timestamps
        // are ordered correctly to be retrieved in a single call
        const childID = Array.from(tree.childrenLevels[0].values())[0].id;
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 100,
            descendantLevels: 1,
            ancestors: 0,
            schema: schemaWithoutAncestry,
            nodes: [childID],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            // a single generation should be three nodes
            { origin: childID, nodeExpectations: { descendants: 3, descendantLevels: 1 } },
          ],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      it('should support returning multiple descendant trees when multiple nodes are requested', async () => {
        // there are 2 levels after the origin, let's get the first level, there will be three
        // children so get the left and right most ones
        const level0Nodes = Array.from(tree.childrenLevels[0].values());
        const leftNodeID = level0Nodes[0].id;
        const rightNodeID = level0Nodes[2].id;
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 6,
            descendantLevels: 0,
            ancestors: 0,
            schema: schemaWithAncestry,
            nodes: [leftNodeID, rightNodeID],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            { origin: leftNodeID, nodeExpectations: { descendantLevels: 1, descendants: 3 } },
            { origin: rightNodeID, nodeExpectations: { descendantLevels: 1, descendants: 3 } },
          ],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
        });
      });

      it('should support returning multiple descendant trees when multiple nodes are requested at different levels', async () => {
        const originParent = parentEntityIDSafeVersion(tree.origin.lifecycle[0]) ?? '';
        expect(originParent).to.not.be('');
        const originGrandparent =
          parentEntityIDSafeVersion(tree.ancestry.get(originParent)!.lifecycle[0]) ?? '';
        expect(originGrandparent).to.not.be('');
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 2,
            descendantLevels: 0,
            ancestors: 0,
            schema: schemaWithAncestry,
            nodes: [tree.origin.id, originGrandparent],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            { origin: tree.origin.id, nodeExpectations: { descendantLevels: 1, descendants: 1 } },
            // the origin's grandparent should only have the origin's parent as a descendant
            {
              origin: originGrandparent,
              nodeExpectations: { descendantLevels: 1, descendants: 1 },
            },
          ],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
        });
      });

      it('should support returning multiple descendant trees when multiple nodes are requested at different levels without ancestry field', async () => {
        const originParent = parentEntityIDSafeVersion(tree.origin.lifecycle[0]) ?? '';
        expect(originParent).to.not.be('');
        const originGrandparent =
          parentEntityIDSafeVersion(tree.ancestry.get(originParent)!.lifecycle[0]) ?? '';
        expect(originGrandparent).to.not.be('');
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 6,
            descendantLevels: 1,
            ancestors: 0,
            schema: schemaWithoutAncestry,
            nodes: [tree.origin.id, originGrandparent],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            { origin: tree.origin.id, nodeExpectations: { descendantLevels: 1, descendants: 3 } },
            // the origin's grandparent should only have the origin's parent as a descendant
            {
              origin: originGrandparent,
              nodeExpectations: { descendantLevels: 1, descendants: 1 },
            },
          ],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });

      it('should respect the time range specified and only return one descendant', async () => {
        const level0Node = Array.from(tree.childrenLevels[0].values())[0];
        const end = new Date(
          timestampSafeVersion(level0Node.lifecycle[0]) ?? new Date()
        ).toISOString();
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 100,
            descendantLevels: 5,
            ancestors: 0,
            schema: schemaWithoutAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: end,
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            { origin: tree.origin.id, nodeExpectations: { descendantLevels: 1, descendants: 1 } },
          ],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
        });
      });
    });

    describe('ancestry and descendants', () => {
      it('returns all descendants and ancestors without the ancestry field and they should have the name field', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 100,
            descendantLevels: 10,
            ancestors: 50,
            schema: schemaWithName,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            // there are 2 levels in the descendant part of the tree and 3 nodes for each
            // descendant = 3 children for the origin + 3 children for each of the origin's children = 12
            {
              origin: tree.origin.id,
              nodeExpectations: { descendants: 12, descendantLevels: 2, ancestors: 5 },
            },
          ],
          response: body,
          schema: schemaWithName,
          genTree: tree,
          relatedEventsCategories: relatedEventsToGen,
        });

        for (const node of body) {
          expect(node.name).to.be(getNameField(node.data, schemaWithName));
          expect(node.name).to.not.be(undefined);
        }
      });

      it('returns all descendants and ancestors without the ancestry field', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 100,
            descendantLevels: 10,
            ancestors: 50,
            schema: schemaWithoutAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            // there are 2 levels in the descendant part of the tree and 3 nodes for each
            // descendant = 3 children for the origin + 3 children for each of the origin's children = 12
            {
              origin: tree.origin.id,
              nodeExpectations: { descendants: 12, descendantLevels: 2, ancestors: 5 },
            },
          ],
          response: body,
          schema: schemaWithoutAncestry,
          genTree: tree,
          relatedEventsCategories: relatedEventsToGen,
        });

        for (const node of body) {
          expect(node.name).to.be(getNameField(node.data, schemaWithoutAncestry));
          expect(node.name).to.be(undefined);
        }
      });

      it('returns all descendants and ancestors with the ancestry field', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 100,
            descendantLevels: 10,
            ancestors: 50,
            schema: schemaWithAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        verifyTree({
          expectations: [
            // there are 2 levels in the descendant part of the tree and 3 nodes for each
            // descendant = 3 children for the origin + 3 children for each of the origin's children = 12
            {
              origin: tree.origin.id,
              nodeExpectations: { descendants: 12, descendantLevels: 2, ancestors: 5 },
            },
          ],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
          relatedEventsCategories: relatedEventsToGen,
        });

        for (const node of body) {
          expect(node.name).to.be(getNameField(node.data, schemaWithAncestry));
          expect(node.name).to.be(undefined);
        }
      });

      it('returns an empty response when limits are zero', async () => {
        const { body }: { body: ResolverNode[] } = await supertest
          .post('/api/endpoint/resolver/tree')
          .set('kbn-xsrf', 'xxx')
          .send({
            descendants: 0,
            descendantLevels: 0,
            ancestors: 0,
            schema: schemaWithAncestry,
            nodes: [tree.origin.id],
            timeRange: {
              from: tree.startTime.toISOString(),
              to: tree.endTime.toISOString(),
            },
            indexPatterns: ['logs-*'],
          })
          .expect(200);
        expect(body).to.be.empty();
        verifyTree({
          expectations: [
            {
              origin: tree.origin.id,
              nodeExpectations: { descendants: 0, descendantLevels: 0, ancestors: 0 },
            },
          ],
          response: body,
          schema: schemaWithAncestry,
          genTree: tree,
        });
      });
    });
  });
}
