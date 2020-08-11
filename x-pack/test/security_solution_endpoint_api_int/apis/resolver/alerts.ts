/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { eventId } from '../../../../plugins/security_solution/common/endpoint/models/event';
import { ResolverRelatedAlerts } from '../../../../plugins/security_solution/common/endpoint/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  Tree,
  RelatedEventCategory,
} from '../../../../plugins/security_solution/common/endpoint/generate_data';
import { Options, GeneratedTrees } from '../../services/resolver';
import { compareArrays } from './common';

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

  describe('related alerts route', () => {
    before(async () => {
      resolverTrees = await resolver.createTrees(treeOptions);
      // we only requested a single alert so there's only 1 tree
      tree = resolverTrees.trees[0];
    });
    after(async () => {
      await resolver.deleteData(resolverTrees);
    });

    it('should not find any alerts', async () => {
      const { body }: { body: ResolverRelatedAlerts } = await supertest
        .post(`/api/endpoint/resolver/5555/alerts`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      expect(body.nextAlert).to.eql(null);
      expect(body.alerts).to.be.empty();
    });

    it('should return details for the root node', async () => {
      const { body }: { body: ResolverRelatedAlerts } = await supertest
        .post(`/api/endpoint/resolver/${tree.origin.id}/alerts`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      expect(body.alerts.length).to.eql(4);
      compareArrays(tree.origin.relatedAlerts, body.alerts, true);
      expect(body.nextAlert).to.eql(null);
    });

    it('should allow alerts to be filtered', async () => {
      const filter = `not event.id:"${tree.origin.relatedAlerts[0].event.id}"`;
      const { body }: { body: ResolverRelatedAlerts } = await supertest
        .post(`/api/endpoint/resolver/${tree.origin.id}/alerts`)
        .set('kbn-xsrf', 'xxx')
        .send({
          filter,
        })
        .expect(200);
      expect(body.alerts.length).to.eql(3);
      compareArrays(tree.origin.relatedAlerts, body.alerts);
      expect(body.nextAlert).to.eql(null);

      // should not find the alert that we excluded in the filter
      expect(
        body.alerts.find((bodyAlert) => {
          return eventId(bodyAlert) === tree.origin.relatedAlerts[0].event.id;
        })
      ).to.not.be.ok();
    });

    it('should return paginated results for the root node', async () => {
      let { body }: { body: ResolverRelatedAlerts } = await supertest
        .post(`/api/endpoint/resolver/${tree.origin.id}/alerts?alerts=2`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      expect(body.alerts.length).to.eql(2);
      compareArrays(tree.origin.relatedAlerts, body.alerts);
      expect(body.nextAlert).not.to.eql(null);

      ({ body } = await supertest
        .post(
          `/api/endpoint/resolver/${tree.origin.id}/alerts?alerts=2&afterAlert=${body.nextAlert}`
        )
        .set('kbn-xsrf', 'xxx')
        .expect(200));
      expect(body.alerts.length).to.eql(2);
      compareArrays(tree.origin.relatedAlerts, body.alerts);
      expect(body.nextAlert).to.not.eql(null);

      ({ body } = await supertest
        .post(
          `/api/endpoint/resolver/${tree.origin.id}/alerts?alerts=2&afterAlert=${body.nextAlert}`
        )
        .set('kbn-xsrf', 'xxx')
        .expect(200));
      expect(body.alerts).to.be.empty();
      expect(body.nextAlert).to.eql(null);
    });

    it('should return the first page of information when the cursor is invalid', async () => {
      const { body }: { body: ResolverRelatedAlerts } = await supertest
        .post(`/api/endpoint/resolver/${tree.origin.id}/alerts?afterAlert=blah`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      expect(body.alerts.length).to.eql(4);
      compareArrays(tree.origin.relatedAlerts, body.alerts, true);
      expect(body.nextAlert).to.eql(null);
    });

    it('should sort the alerts in ascending order', async () => {
      const { body }: { body: ResolverRelatedAlerts } = await supertest
        .post(`/api/endpoint/resolver/${tree.origin.id}/alerts`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      const sortedAsc = [...tree.origin.relatedAlerts].sort((event1, event2) => {
        // this sorts the events by timestamp in ascending order
        const diff = event1['@timestamp'] - event2['@timestamp'];
        // if the timestamps are the same, fallback to the event.id sorted in
        // ascending order
        if (diff === 0) {
          if (event1.event.id < event2.event.id) {
            return -1;
          }
          if (event1.event.id > event2.event.id) {
            return 1;
          }
          return 0;
        }
        return diff;
      });

      expect(body.alerts.length).to.eql(4);
      for (let i = 0; i < body.alerts.length; i++) {
        expect(eventId(body.alerts[i])).to.equal(sortedAsc[i].event.id);
      }
    });
  });
}
