/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TimelineTypeEnum } from '@kbn/security-solution-plugin/common/api/timeline';
import { TIMELINE_URL } from '@kbn/security-solution-plugin/common/constants';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import { createBasicTimeline } from '../../utils/timelines';

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  let supertest: TestAgent;

  describe('Timeline - Saved Objects', () => {
    before(async () => (supertest = await utils.createSuperTest()));

    describe('Persist a timeline', () => {
      it('Create a timeline just with a title', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(supertest, titleToSaved);
        const { savedObjectId, title, version } = response.body;

        expect(title).to.be(titleToSaved);
        expect(savedObjectId).to.not.be.empty();
        expect(version).to.not.be.empty();
      });

      it('Create a timeline with a full object', async () => {
        const timelineObject = {
          columns: [
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: '@timestamp',
              name: null,
              searchable: null,
            },
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: '_index',
              name: null,
              searchable: null,
            },
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: 'message',
              name: null,
              searchable: null,
            },
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: 'event.category',
              name: null,
              searchable: null,
            },
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: 'event.action',
              name: null,
              searchable: null,
            },
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: 'host.name',
              name: null,
              searchable: null,
            },
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: 'source.ip',
              name: null,
              searchable: null,
            },
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: 'destination.ip',
              name: null,
              searchable: null,
            },
            {
              columnHeaderType: 'not-filtered',
              indexes: null,
              id: 'user.name',
              name: null,
              searchable: null,
            },
          ],
          dataProviders: [
            {
              id: 'hosts-table-hostName-zeek-iowa',
              name: 'zeek-iowa',
              enabled: true,
              excluded: false,
              kqlQuery: '',
              type: 'default',
              queryMatch: {
                field: 'host.name',
                displayField: null,
                value: 'zeek-iowa',
                displayValue: null,
                operator: ':',
              },
              and: [],
            },
          ],
          description: 'some description',
          kqlMode: 'filter',
          kqlQuery: {
            filterQuery: {
              kuery: {
                kind: 'kuery',
                expression: 'network.community_id : "1:pNuEtJ941SagdsAnFculFyREvXw=" ',
              },
              serializedQuery:
                '{"bool":{"should":[{"match_phrase":{"network.community_id":"1:pNuEtJ941SagdsAnFculFyREvXw="}}],"minimum_should_match":1}}',
            },
          },
          title: 'some title',
          dateRange: { start: '2019-06-10T19:43:20.755Z', end: '2019-06-11T19:43:20.756Z' },
          sort: { columnId: '@timestamp', sortDirection: 'desc' },
        };

        const response = await supertest.post(TIMELINE_URL).set('kbn-xsrf', 'true').send({
          timelineId: null,
          version: null,
          timeline: timelineObject,
        });
        const {
          columns,
          dataProviders,
          dateRange,
          description,
          kqlMode,
          kqlQuery,
          savedObjectId,
          sort,
          title,
          version,
        } = response.body;

        expect(columns.map((col: { id: string }) => col.id)).to.eql(
          timelineObject.columns.map((col) => col.id)
        );
        expect(dataProviders).to.eql(timelineObject.dataProviders);
        expect(dateRange).to.eql(timelineObject.dateRange);
        expect(description).to.be(timelineObject.description);
        expect(kqlMode).to.be(timelineObject.kqlMode);
        expect(kqlQuery).to.eql(timelineObject.kqlQuery);
        expect(savedObjectId).to.not.be.empty();
        expect(sort).to.eql([timelineObject.sort]);
        expect(title).to.be(timelineObject.title);
        expect(version).to.not.be.empty();
      });

      it('Update a timeline with a new title', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(supertest, titleToSaved);
        const { savedObjectId, version } = response.body;

        const newTitle = 'new title';

        const responseToTest = await supertest
          .patch(TIMELINE_URL)
          .set('kbn-xsrf', 'true')
          .send({
            timelineId: savedObjectId,
            version,
            timeline: {
              title: newTitle,
            },
          });
        expect(responseToTest.body.savedObjectId).to.eql(savedObjectId);
        expect(responseToTest.body.title).to.be(newTitle);
        expect(responseToTest.body.version).to.not.be.eql(version);
      });
    });

    describe('Persist favorite', () => {
      it('to an existing timeline', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(supertest, titleToSaved);

        const { savedObjectId, version } = response.body;

        const responseToTest = await supertest
          .patch('/api/timeline/_favorite')
          .set('kbn-xsrf', 'true')
          .send({
            timelineId: savedObjectId,
            templateTimelineId: null,
            templateTimelineVersion: null,
            timelineType: TimelineTypeEnum.default,
          });

        expect(responseToTest.body.savedObjectId).to.be(savedObjectId);
        expect(responseToTest.body.favorite.length).to.be(1);
        expect(responseToTest.body.version).to.not.be.eql(version);
        expect(responseToTest.body.templateTimelineId).to.be.eql(null);
        expect(responseToTest.body.templateTimelineVersion).to.be.eql(null);
        expect(responseToTest.body.timelineType).to.be.eql(TimelineTypeEnum.default);
      });

      it('to an existing timeline template', async () => {
        const titleToSaved = 'hello title';
        const templateTimelineIdFromStore = 'f4a90a2d-365c-407b-9fef-c1dcb33a6ab3';
        const templateTimelineVersionFromStore = 1;
        const response = await createBasicTimeline(supertest, titleToSaved);
        const { savedObjectId, version } = response.body;

        const responseToTest = await supertest
          .patch('/api/timeline/_favorite')
          .set('kbn-xsrf', 'true')
          .send({
            timelineId: savedObjectId,
            templateTimelineId: templateTimelineIdFromStore,
            templateTimelineVersion: templateTimelineVersionFromStore,
            timelineType: TimelineTypeEnum.template,
          });
        expect(responseToTest.body.savedObjectId).to.be(savedObjectId);
        expect(responseToTest.body.favorite.length).to.be(1);
        expect(responseToTest.body.version).to.not.be.eql(version);
        expect(responseToTest.body.templateTimelineId).to.be.eql(templateTimelineIdFromStore);
        expect(responseToTest.body.templateTimelineVersion).to.be.eql(
          templateTimelineVersionFromStore
        );
        expect(responseToTest.body.timelineType).to.be.eql(TimelineTypeEnum.template);
      });

      it('to Unfavorite an existing timeline', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(supertest, titleToSaved);
        const { savedObjectId, version } = response.body;

        await supertest.patch('/api/timeline/_favorite').set('kbn-xsrf', 'true').send({
          timelineId: savedObjectId,
          templateTimelineId: null,
          templateTimelineVersion: null,
          timelineType: TimelineTypeEnum.default,
        });

        const responseToTest = await supertest
          .patch('/api/timeline/_favorite')
          .set('kbn-xsrf', 'true')
          .send({
            timelineId: savedObjectId,
            templateTimelineId: null,
            templateTimelineVersion: null,
            timelineType: TimelineTypeEnum.default,
          });

        expect(responseToTest.body.savedObjectId).to.be(savedObjectId);
        expect(responseToTest.body.favorite).to.be.empty();
        expect(responseToTest.body.version).to.not.be.eql(version);
        expect(responseToTest.body.templateTimelineId).to.be.eql(null);
        expect(responseToTest.body.templateTimelineVersion).to.be.eql(null);
        expect(responseToTest.body.timelineType).to.be.eql(TimelineTypeEnum.default);
      });

      it('to Unfavorite an existing timeline template', async () => {
        const titleToSaved = 'hello title';
        const templateTimelineIdFromStore = 'f4a90a2d-365c-407b-9fef-c1dcb33a6ab3';
        const templateTimelineVersionFromStore = 1;
        const response = await createBasicTimeline(supertest, titleToSaved);
        const { savedObjectId, version } = response.body;

        await supertest.patch('/api/timeline/_favorite').set('kbn-xsrf', 'true').send({
          timelineId: savedObjectId,
          templateTimelineId: templateTimelineIdFromStore,
          templateTimelineVersion: templateTimelineVersionFromStore,
          timelineType: TimelineTypeEnum.template,
        });

        const responseToTest = await supertest
          .patch('/api/timeline/_favorite')
          .set('kbn-xsrf', 'true')
          .send({
            timelineId: savedObjectId,
            templateTimelineId: templateTimelineIdFromStore,
            templateTimelineVersion: templateTimelineVersionFromStore,
            timelineType: TimelineTypeEnum.template,
          });

        expect(responseToTest.body.savedObjectId).to.be(savedObjectId);
        expect(responseToTest.body.favorite).to.be.empty();
        expect(responseToTest.body.version).to.not.be.eql(version);
        expect(responseToTest.body.templateTimelineId).to.be.eql(templateTimelineIdFromStore);
        expect(responseToTest.body.templateTimelineVersion).to.be.eql(
          templateTimelineVersionFromStore
        );
        expect(responseToTest.body.timelineType).to.be.eql(TimelineTypeEnum.template);
      });

      it('to a timeline without a timelineId', async () => {
        const response = await supertest
          .patch('/api/timeline/_favorite')
          .set('kbn-xsrf', 'true')
          .send({
            timelineId: null,
            templateTimelineId: null,
            templateTimelineVersion: null,
            timelineType: TimelineTypeEnum.default,
          });

        expect(response.body.savedObjectId).to.not.be.empty();
        expect(response.body.favorite.length).to.be(1);
        expect(response.body.version).to.not.be.empty();
        expect(response.body.templateTimelineId).to.be.eql(null);
        expect(response.body.templateTimelineVersion).to.be.eql(null);
        expect(response.body.timelineType).to.be.eql(TimelineTypeEnum.default);
      });

      it('to a timeline template without a timelineId', async () => {
        const templateTimelineIdFromStore = 'f4a90a2d-365c-407b-9fef-c1dcb33a6ab3';
        const templateTimelineVersionFromStore = 1;

        const response = await supertest
          .patch('/api/timeline/_favorite')
          .set('kbn-xsrf', 'true')
          .send({
            timelineId: null,
            templateTimelineId: templateTimelineIdFromStore,
            templateTimelineVersion: templateTimelineVersionFromStore,
            timelineType: TimelineTypeEnum.template,
          });

        expect(response.body.savedObjectId).to.not.be.empty();
        expect(response.body.favorite.length).to.be(1);
        expect(response.body.version).to.not.be.empty();
        expect(response.body.templateTimelineId).to.be.eql(templateTimelineIdFromStore);
        expect(response.body.templateTimelineVersion).to.be.eql(templateTimelineVersionFromStore);
        expect(response.body.timelineType).to.be.eql(TimelineTypeEnum.template);
      });
    });

    describe('Delete', () => {
      it('one timeline', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(supertest, titleToSaved);
        const { savedObjectId } = response.body;

        const responseToTest = await supertest
          .delete(TIMELINE_URL)
          .set('kbn-xsrf', 'true')
          .send({
            savedObjectIds: [savedObjectId],
          });

        expect(responseToTest.statusCode).to.be(200);
      });

      it('multiple timelines', async () => {
        const titleToSaved = 'hello title';
        const response1 = await createBasicTimeline(supertest, titleToSaved);
        const savedObjectId1 = response1.body ? response1.body.savedObjectId : '';

        const response2 = await createBasicTimeline(supertest, titleToSaved);
        const savedObjectId2 = response2.body ? response2.body.savedObjectId : '';

        const responseToTest = await supertest
          .delete(TIMELINE_URL)
          .set('kbn-xsrf', 'true')
          .send({
            savedObjectIds: [savedObjectId1, savedObjectId2],
          });

        expect(responseToTest.status).to.be(200);
      });
    });
  });
}
