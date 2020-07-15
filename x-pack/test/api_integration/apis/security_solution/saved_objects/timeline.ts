/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import ApolloClient from 'apollo-client';

import { FtrProviderContext } from '../../../ftr_provider_context';

import { deleteTimelineMutation } from '../../../../../plugins/security_solution/public/timelines/containers/delete/persist.gql_query';
import { persistTimelineFavoriteMutation } from '../../../../../plugins/security_solution/public/timelines/containers/favorite/persist.gql_query';
import { persistTimelineMutation } from '../../../../../plugins/security_solution/public/timelines/containers/persist.gql_query';
import { TimelineResult } from '../../../../../plugins/security_solution/public/graphql/types';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');

  describe('Timeline - Saved Objects', () => {
    beforeEach(() => esArchiver.load('empty_kibana'));
    afterEach(() => esArchiver.unload('empty_kibana'));

    describe('Persist a timeline', () => {
      it('Create a timeline just with a title', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(client, titleToSaved);
        const { savedObjectId, title, version } =
          response.data && response.data.persistTimeline.timeline;

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
        const response = await client.mutate<any>({
          mutation: persistTimelineMutation,
          variables: {
            timelineId: null,
            version: null,
            timeline: timelineObject,
          },
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
        } = response.data && omitTypenameInTimeline(response.data.persistTimeline.timeline);

        expect(columns.map((col: { id: string }) => col.id)).to.eql(
          timelineObject.columns.map((col) => col.id)
        );
        expect(dataProviders).to.eql(timelineObject.dataProviders);
        expect(dateRange).to.eql(timelineObject.dateRange);
        expect(description).to.be(timelineObject.description);
        expect(kqlMode).to.be(timelineObject.kqlMode);
        expect(kqlQuery).to.eql(timelineObject.kqlQuery);
        expect(savedObjectId).to.not.be.empty();
        expect(sort).to.eql(timelineObject.sort);
        expect(title).to.be(timelineObject.title);
        expect(version).to.not.be.empty();
      });

      it('Update a timeline with a new title', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(client, titleToSaved);
        const { savedObjectId, version } = response.data && response.data.persistTimeline.timeline;

        const newTitle = 'new title';
        const responseToTest = await client.mutate<any>({
          mutation: persistTimelineMutation,
          variables: {
            timelineId: savedObjectId,
            version,
            timeline: {
              title: newTitle,
            },
          },
        });

        expect(responseToTest.data!.persistTimeline.timeline.savedObjectId).to.eql(savedObjectId);
        expect(responseToTest.data!.persistTimeline.timeline.title).to.be(newTitle);
        expect(responseToTest.data!.persistTimeline.timeline.version).to.not.be.eql(version);
      });
    });

    describe('Persist favorite', () => {
      it('to an existing timeline', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(client, titleToSaved);
        const { savedObjectId, version } = response.data && response.data.persistTimeline.timeline;

        const responseToTest = await client.mutate<any>({
          mutation: persistTimelineFavoriteMutation,
          variables: {
            timelineId: savedObjectId,
          },
        });

        expect(responseToTest.data!.persistFavorite.savedObjectId).to.be(savedObjectId);
        expect(responseToTest.data!.persistFavorite.favorite.length).to.be(1);
        expect(responseToTest.data!.persistFavorite.version).to.not.be.eql(version);
      });

      it('to Unfavorite an existing timeline', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(client, titleToSaved);
        const { savedObjectId, version } = response.data && response.data.persistTimeline.timeline;

        await client.mutate<any>({
          mutation: persistTimelineFavoriteMutation,
          variables: {
            timelineId: savedObjectId,
          },
        });

        const responseToTest = await client.mutate<any>({
          mutation: persistTimelineFavoriteMutation,
          variables: {
            timelineId: savedObjectId,
          },
        });

        expect(responseToTest.data!.persistFavorite.savedObjectId).to.be(savedObjectId);
        expect(responseToTest.data!.persistFavorite.favorite).to.be.empty();
        expect(responseToTest.data!.persistFavorite.version).to.not.be.eql(version);
      });

      it('to a timeline without a timelineId', async () => {
        const response = await client.mutate<any>({
          mutation: persistTimelineFavoriteMutation,
          variables: {
            timelineId: null,
          },
        });

        expect(response.data!.persistFavorite.savedObjectId).to.not.be.empty();
        expect(response.data!.persistFavorite.favorite.length).to.be(1);
        expect(response.data!.persistFavorite.version).to.not.be.empty();
      });
    });

    describe('Delete', () => {
      it('one timeline', async () => {
        const titleToSaved = 'hello title';
        const response = await createBasicTimeline(client, titleToSaved);
        const { savedObjectId } = response.data && response.data.persistTimeline.timeline;

        const responseToTest = await client.mutate<any>({
          mutation: deleteTimelineMutation,
          variables: {
            id: [savedObjectId],
          },
        });

        expect(responseToTest.data!.deleteTimeline).to.be(true);
      });

      it('multiple timeline', async () => {
        const titleToSaved = 'hello title';
        const response1 = await createBasicTimeline(client, titleToSaved);
        const savedObjectId1 =
          response1.data && response1.data.persistTimeline.timeline
            ? response1.data.persistTimeline.timeline.savedObjectId
            : '';

        const response2 = await createBasicTimeline(client, titleToSaved);
        const savedObjectId2 =
          response2.data && response2.data.persistTimeline.timeline
            ? response2.data.persistTimeline.timeline.savedObjectId
            : '';

        const responseToTest = await client.mutate<any>({
          mutation: deleteTimelineMutation,
          variables: {
            id: [savedObjectId1, savedObjectId2],
          },
        });

        expect(responseToTest.data!.deleteTimeline).to.be(true);
      });
    });
  });
}

const omitTypename = (key: string, value: keyof TimelineResult) =>
  key === '__typename' ? undefined : value;

const omitTypenameInTimeline = (timeline: TimelineResult) =>
  JSON.parse(JSON.stringify(timeline), omitTypename);

const createBasicTimeline = async (client: ApolloClient<any>, titleToSaved: string) =>
  await client.mutate<any>({
    mutation: persistTimelineMutation,
    variables: {
      timelineId: null,
      version: null,
      timeline: {
        title: titleToSaved,
      },
    },
  });
