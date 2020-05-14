/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { LifecycleNode, ResolverAncestry } from '../../../../plugins/endpoint/common/types';
import { parentEntityId } from '../../../../plugins/endpoint/common/models/event';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  EndpointDocGenerator,
  Event,
  Tree,
  TreeOptions,
  TreeNode,
} from '../../../../../x-pack/plugins/endpoint/common/generate_data';
const commonHeaders = {
  accept: 'application/json',
  'kbn-xsrf': 'some-xsrf-token',
};

interface Options extends TreeOptions {
  numAlerts?: number;
}

interface GeneratedTrees {
  trees: Tree[];
  index: string;
}

async function createResolverTree(
  getService: any,
  options: Options,
  eventsIndex: string = 'events-endpoint-1'
): Promise<GeneratedTrees> {
  const allTrees: Tree[] = [];
  const client = getService('es');
  const generator = new EndpointDocGenerator();
  const numAlerts = options.numAlerts ?? 1;
  for (let j = 0; j < numAlerts; j++) {
    const tree = generator.generateTree(options);
    const body = tree.allEvents.reduce(
      (array: Array<Record<string, any>>, doc) => (
        array.push({ index: { _index: eventsIndex } }, doc), array
      ),
      []
    );
    await client.bulk({ body });
    allTrees.push(tree);
  }
  return { trees: allTrees, index: eventsIndex };
}

async function deleteTrees(getService: any, trees: GeneratedTrees) {
  const client = getService('es');
  await client.indices.delete({
    index: trees.index,
  });
}

const expectLifecycleNodeInMap = (node: LifecycleNode, nodeMap: Map<string, TreeNode>) => {
  const genNode = nodeMap.get(node.id);
  expect(genNode).not.to.be(null);
  expect(genNode?.lifecycle).to.eql(node.lifecycle);
};

const verifyAncestry = (origin: LifecycleNode, ancestors: LifecycleNode[], tree: Tree) => {
  expect(origin.lifecycle).to.eql(tree.origin.lifecycle);
  ancestors.forEach(node => {
    expectLifecycleNodeInMap(node, tree.ancestry);
  });
};

export default function resolverAPIIntegrationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  let resolverTrees: GeneratedTrees;
  let tree: Tree;
  const treeOptions: Options = {
    ancestors: 5,
    relatedEvents: 4,
    children: 3,
    generations: 3,
    percentTerminated: 100,
    percentWithRelated: 100,
    numAlerts: 1,
    alwaysGenMaxChildrenPerNode: true,
  };

  describe('Resolver', () => {
    describe('related events route', () => {
      describe('legacy events', () => {
        before(async () => await esArchiver.load('endpoint/resolver/api_feature'));
        after(async () => await esArchiver.unload('endpoint/resolver/api_feature'));

        const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
        const entityID = '94042';
        const cursor = 'eyJ0aW1lc3RhbXAiOjE1ODE0NTYyNTUwMDAsImV2ZW50SUQiOiI5NDA0MyJ9';

        it('should return details for the root node', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}`)
            .expect(200);
          expect(body.events.length).to.eql(1);
          expect(body.id).to.eql(entityID);
          expect(body.nextEvent).to.eql(null);
        });

        it('returns no values when there is no more data', async () => {
          const { body } = await supertest
            // after is set to the document id of the last event so there shouldn't be any more after it
            .get(
              `/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}&afterEvent=${cursor}`
            )
            .expect(200);
          expect(body.events).be.empty();
          expect(body.id).to.eql(entityID);
          expect(body.nextEvent).to.eql(null);
        });

        it('should return the first page of information when the cursor is invalid', async () => {
          const { body } = await supertest
            .get(
              `/api/endpoint/resolver/${entityID}/events?legacyEndpointID=${endpointID}&afterEvent=blah`
            )
            .expect(200);
          expect(body.id).to.eql(entityID);
          expect(body.nextEvent).to.eql(null);
        });

        it('should return no results for an invalid endpoint ID', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/events?legacyEndpointID=foo`)
            .expect(200);
          expect(body.nextEvent).to.eql(null);
          expect(body.id).to.eql(entityID);
          expect(body.events).to.be.empty();
        });

        it('should error on invalid pagination values', async () => {
          await supertest
            .get(`/api/endpoint/resolver/${entityID}/events?events=0`)
            .set(commonHeaders)
            .expect(400);
          await supertest
            .get(`/api/endpoint/resolver/${entityID}/events?events=2000`)
            .set(commonHeaders)
            .expect(400);
          await supertest
            .get(`/api/endpoint/resolver/${entityID}/events?events=-1`)
            .set(commonHeaders)
            .expect(400);
        });
      });

      describe('endpoint events', () => {
        before(async () => {
          resolverTrees = await createResolverTree(getService, treeOptions);

          // we only requested a single alert so there's only 1 tree
          tree = resolverTrees.trees[0];
        });
        after(async () => {
          await deleteTrees(getService, resolverTrees);
        });

        it('should not find any events', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/5555/events`)
            .set(commonHeaders)
            .expect(200);
          expect(body.nextEvent).to.eql(null);
          expect(body.events).to.be.empty();
        });

        it('should return details for the root node', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/events`)
            .expect(200);
          expect(body.events.length).to.eql(4);
          expect(body.events).to.eql(tree.origin.relatedEvents);
          expect(body.nextEvent).to.eql(null);
        });

        it('should return paginated results for the root node', async () => {
          let { body } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/events?events=2`)
            .expect(200);
          expect(body.events.length).to.eql(2);
          expect(body.events).to.eql(tree.origin.relatedEvents.slice(0, 2));
          expect(body.nextEvent).not.to.eql(null);

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${tree.origin.id}/events?events=2&afterEvent=${body.nextEvent}`
            )
            .expect(200));
          expect(body.events.length).to.eql(2);
          expect(body.events).to.eql(tree.origin.relatedEvents.slice(2));
          expect(body.nextEvent).to.eql(null);
        });

        it('should return the first page of information when the cursor is invalid', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/events?afterEvent=blah`)
            .expect(200);
          expect(body.events.length).to.eql(4);
          expect(body.events).to.eql(tree.origin.relatedEvents);
          expect(body.nextEvent).to.eql(null);
        });
      });
    });

    describe('ancestry events route', () => {
      describe('legacy events', () => {
        before(async () => await esArchiver.load('endpoint/resolver/api_feature'));
        after(async () => await esArchiver.unload('endpoint/resolver/api_feature'));
        const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
        const entityID = '94042';

        it('should return details for the root node', async () => {
          const { body } = await supertest
            .get(
              `/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}&ancestors=5`
            )
            .expect(200);
          expect(body.ancestors.lifecycle.length).to.eql(2);
          expect(body.nextAncestor).to.eql(null);
        });

        it('should have a populated next parameter', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}`)
            .expect(200);
          expect(body.nextAncestor).to.eql('94041');
        });

        it('should handle an ancestors param request', async () => {
          let { body } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/ancestry?legacyEndpointID=${endpointID}`)
            .expect(200);
          const next = body.nextAncestor;

          ({ body } = await supertest
            .get(
              `/api/endpoint/resolver/${next}/ancestry?legacyEndpointID=${endpointID}&ancestors=1`
            )
            .expect(200));
          expect(body.lifecycle.length).to.eql(1);
          expect(body.nextAncestor).to.eql(null);
        });
      });

      describe('endpoint events', () => {
        const getRootAndAncestry = (ancestry: ResolverAncestry) => {
          return { root: ancestry.ancestors[0], ancestry: ancestry.ancestors.slice(1) };
        };

        before(async () => {
          resolverTrees = await createResolverTree(getService, treeOptions);
          // we only requested a single alert so there's only 1 tree
          tree = resolverTrees.trees[0];
        });
        after(async () => {
          await deleteTrees(getService, resolverTrees);
        });

        it('should return details for the root node', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/ancestry?ancestors=9`)
            .expect(200);
          // the tree we generated had 5 ancestors + 1 origin node
          expect(body.ancestors.length).to.eql(6);
          const ancestryInfo = getRootAndAncestry(body.ancestors);
          verifyAncestry(ancestryInfo.root, ancestryInfo.ancestry, tree);
          expect(body.nextAncestor).to.eql(null);
        });

        it('should handle an invalid id', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/alskdjflasj/ancestry`)
            .set(commonHeaders)
            .expect(200);
          expect(body.lifecycle.length).to.eql(0);
          expect(body.pagination.nextAncestor).to.eql(null);
        });

        it('should have a populated next parameter', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/ancestry?ancestors=2`)
            .expect(200);
          // it should have 2 ancestors + 1 origin
          expect(body.ancestors.length).to.eql(3);
          const ancestryInfo = getRootAndAncestry(body.ancestors);
          verifyAncestry(ancestryInfo.root, ancestryInfo.ancestry, tree);
          expect(body.nextAncestor).to.eql(
            // it should be the parent entity id on the last element of the ancestry array
            parentEntityId(ancestryInfo.ancestry[ancestryInfo.ancestry.length - 1].lifecycle[0])
          );
        });

        it('should handle multiple ancestor requests', async () => {
          let { body } = await supertest
            .get(`/api/endpoint/resolver/${tree.origin.id}/ancestry?ancestors=3`)
            .expect(200);
          const next = body.nextAncestor;

          ({ body } = await supertest
            .get(`/api/endpoint/resolver/${next}/ancestry?ancestors=1`)
            .expect(200));
          expect(body.ancestors.length).to.eql(2);
          const ancestryInfo = getRootAndAncestry(body.ancestors);
          verifyAncestry(ancestryInfo.root, ancestryInfo.ancestry, tree);
          expect(body.nextAncestor).to.not.eql(null);
        });
      });
    });

    describe('children route', () => {
      describe('legacy events', () => {
        before(async () => await esArchiver.load('endpoint/resolver/api_feature'));
        after(async () => await esArchiver.unload('endpoint/resolver/api_feature'));
        const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';
        const entityID = '94041';
        const cursor = 'eyJ0aW1lc3RhbXAiOjE1ODE0NTYyNTUwMDAsImV2ZW50SUQiOiI5NDA0MiJ9';

        it('returns child process lifecycle events', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/children?legacyEndpointID=${endpointID}`)
            .expect(200);
          expect(body.childNodes.length).to.eql(1);
          expect(body.childNodes[0].lifecycle.length).to.eql(2);
          expect(body.childNodes[0].lifecycle[0].endgame.unique_pid).to.eql(94042);
        });

        it('returns multiple levels of child process lifecycle events', async () => {
          const { body } = await supertest
            .get(
              `/api/endpoint/resolver/93802/children?legacyEndpointID=${endpointID}&generations=3`
            )
            .expect(200);
          expect(body.nextChild).to.be(null);
          expect(body.childNodes[0].nextChild).to.be(null);

          expect(body.childNodes.length).to.eql(8);
          // TODO
          // expect(body.childNodes[0].children[0].lifecycle.length).to.eql(2);
          expect(body.childNodes[0].lifecycle[0].endgame.unique_pid).to.eql(93932);
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
          const { body } = await supertest
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
            .get(`/api/endpoint/resolver/${entityID}/children?children=2000`)
            .expect(400);
          await supertest
            .get(`/api/endpoint/resolver/${entityID}/children?children=-1`)
            .expect(400);
        });

        it('returns empty events without a matching entity id', async () => {
          const { body } = await supertest.get(`/api/endpoint/resolver/5555/children`).expect(200);
          expect(body.nextChild).to.eql(null);
          expect(body.childNodes).to.be.empty();
        });

        it('returns empty events with an invalid endpoint id', async () => {
          const { body } = await supertest
            .get(`/api/endpoint/resolver/${entityID}/children?legacyEndpointID=foo`)
            .expect(200);
          expect(body.nextChild).to.eql(null);
          expect(body.childNodes).to.be.empty();
        });
      });
    });

    describe('tree endpoint', () => {
      before(async () => await esArchiver.load('endpoint/resolver/api_feature'));
      after(async () => await esArchiver.unload('endpoint/resolver/api_feature'));
      const endpointID = '5a0c957f-b8e7-4538-965e-57e8bb86ad3a';

      it('returns ancestors, events, children, and current process lifecycle', async () => {
        const { body } = await supertest
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
  });
}
