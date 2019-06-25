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

import { allTimelinesQuery } from '../../../../../legacy/plugins/siem/public/containers/timeline/all/index.gql_query';
import { deleteTimelineMutation } from '../../../../../legacy/plugins/siem/public/containers/timeline/delete/persist.gql_query';
import { persistTimelineFavoriteMutation } from '../../../../../legacy/plugins/siem/public/containers/timeline/favorite/persist.gql_query';
import { persistTimelineMutation } from '../../../../../legacy/plugins/siem/public/containers/timeline/persist.gql_query';
import {
  GetAllTimeline,
  TimelineResult,
} from '../../../../../legacy/plugins/siem/public/graphql/types';

import { KbnTestProvider } from '../types';

const timelinePersistenceTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

  describe('Timeline - Saved Objects', () => {
    beforeEach(() => esArchiver.load('empty_kibana'));
    afterEach(() => esArchiver.unload('empty_kibana'));

    describe('Persist a timeline', () => {
      it('Create a timeline just with a title', async () => {
        const titleToSaved = 'hello title';
        const response = await client.mutate<any>({
          mutation: persistTimelineMutation,
          variables: {
            timelineId: null,
            version: null,
            timeline: {
              title: titleToSaved,
            },
          },
        });
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
          dateRange: { start: 1560195800755, end: 1560282200756 },
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
          timelineObject.columns.map(col => col.id)
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
        const responseData = await client.query<GetAllTimeline.Query>({
          query: allTimelinesQuery,
          variables: {
            search: '',
            pageInfo: { pageIndex: 1, pageSize: 10 },
            sort: { sortField: 'updated', sortOrder: 'desc' },
          },
        });
        if (
          responseData.data.getAllTimeline.timeline &&
          responseData.data.getAllTimeline.timeline.length > 0 &&
          responseData.data.getAllTimeline.timeline[0] != null
        ) {
          const { savedObjectId, version } = responseData.data.getAllTimeline.timeline[0]!;
          const newTitle = 'new title';
          const response = await client.mutate<any>({
            mutation: persistTimelineMutation,
            variables: {
              timelineId: savedObjectId,
              version,
              timeline: {
                title: newTitle,
              },
            },
          });

          expect(response.data!.persistTimeline.timeline.savedObjectId).to.be(savedObjectId);
          expect(response.data!.persistTimeline.timeline.title).to.be(newTitle);
          expect(response.data!.persistTimeline.timeline.version).to.be(version);
        }
      });
    });

    describe('Persist favorite', () => {
      it('to an existing timeline', async () => {
        const responseData = await client.query<GetAllTimeline.Query>({
          query: allTimelinesQuery,
          variables: {
            search: '',
            pageInfo: { pageIndex: 1, pageSize: 10 },
            sort: { sortField: 'updated', sortOrder: 'desc' },
          },
        });
        if (
          responseData.data.getAllTimeline.timeline &&
          responseData.data.getAllTimeline.timeline.length > 0 &&
          responseData.data.getAllTimeline.timeline[0] != null
        ) {
          const { savedObjectId, version } = responseData.data.getAllTimeline.timeline[0]!;

          const response = await client.mutate<any>({
            mutation: persistTimelineFavoriteMutation,
            variables: {
              timelineId: savedObjectId,
            },
          });

          expect(response.data!.persistFavorite.savedObjectId).to.be(savedObjectId);
          expect(response.data!.persistTimeline.favorite.length).to.be(1);
          expect(response.data!.persistTimeline.version).to.be(version);
        }
      });

      it('to Unfavorite an existing timeline', async () => {
        const responseData = await client.query<GetAllTimeline.Query>({
          query: allTimelinesQuery,
          variables: {
            search: '',
            pageInfo: { pageIndex: 1, pageSize: 10 },
            sort: { sortField: 'updated', sortOrder: 'desc' },
          },
        });
        if (
          responseData.data.getAllTimeline.timeline &&
          responseData.data.getAllTimeline.timeline.length > 0 &&
          responseData.data.getAllTimeline.timeline[0] != null
        ) {
          const { savedObjectId, version } = responseData.data.getAllTimeline.timeline[0]!;

          const response = await client.mutate<any>({
            mutation: persistTimelineFavoriteMutation,
            variables: {
              timelineId: savedObjectId,
            },
          });

          expect(response.data!.persistFavorite.savedObjectId).to.be(savedObjectId);
          expect(response.data!.persistTimeline.favorite.length).to.be.empty();
          expect(response.data!.persistTimeline.version).to.be(version);
        }
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
        const responseData = await client.query<GetAllTimeline.Query>({
          query: allTimelinesQuery,
          variables: {
            search: '',
            pageInfo: { pageIndex: 1, pageSize: 10 },
            sort: { sortField: 'updated', sortOrder: 'desc' },
          },
        });
        if (
          responseData.data.getAllTimeline.timeline &&
          responseData.data.getAllTimeline.timeline.length > 0 &&
          responseData.data.getAllTimeline.timeline[0] != null
        ) {
          const { savedObjectId } = responseData.data.getAllTimeline.timeline[0]!;

          const response = await client.mutate<any>({
            mutation: deleteTimelineMutation,
            variables: {
              id: [savedObjectId],
            },
          });

          expect(response.data!.deleteTimeline).to.be(true);
        }
      });

      it('multiple timeline', async () => {
        const responseData = await client.query<GetAllTimeline.Query>({
          query: allTimelinesQuery,
          variables: {
            search: '',
            pageInfo: { pageIndex: 1, pageSize: 10 },
            sort: { sortField: 'updated', sortOrder: 'desc' },
          },
        });
        if (
          responseData.data.getAllTimeline.timeline &&
          responseData.data.getAllTimeline.timeline.length > 0
        ) {
          const response = await client.mutate<any>({
            mutation: deleteTimelineMutation,
            variables: {
              id: responseData.data.getAllTimeline.timeline.map(t => t!.savedObjectId),
            },
          });

          expect(response.data!.deleteTimeline).to.be(true);
        }
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default timelinePersistenceTests;

const omitTypename = (key: string, value: keyof TimelineResult) =>
  key === '__typename' ? undefined : value;

const omitTypenameInTimeline = (timeline: TimelineResult) =>
  JSON.parse(JSON.stringify(timeline), omitTypename);
