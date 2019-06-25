/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { allTimelinesQuery } from '../../../../../legacy/plugins/siem/public/containers/timeline/all/index.gql_query';
import { persistTimelinePinnedEventMutation } from '../../../../../legacy/plugins/siem/public/containers/timeline/pinned_event/persist.gql_query';
import { GetAllTimeline } from '../../../../../legacy/plugins/siem/public/graphql/types';

import { KbnTestProvider } from '../types';

const pinnedEventsPersistenceTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

  describe('Pinned Events - Saved Objects', () => {
    beforeEach(() => esArchiver.load('empty_kibana'));
    afterEach(() => esArchiver.unload('empty_kibana'));

    describe('Pinned an event', () => {
      it('return a timelineId, timelineVersion, pinnedEventId and version', async () => {
        const response = await client.mutate<any>({
          mutation: persistTimelinePinnedEventMutation,
          variables: {
            pinnedEventId: null,
            eventId: 'bv4QSGsB9v5HJNSH-7fi',
          },
        });
        const { eventId, pinnedEventId, timelineId, timelineVersion, version } =
          response.data && response.data.persistPinnedEventOnTimeline;

        expect(eventId).to.be('bv4QSGsB9v5HJNSH-7fi');
        expect(pinnedEventId).to.not.be.empty();
        expect(timelineId).to.not.be.empty();
        expect(timelineVersion).to.not.be.empty();
        expect(version).to.not.be.empty();
      });
    });

    describe('Unpinned an event', () => {
      it('return null', async () => {
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
          responseData.data.getAllTimeline.timeline[0] != null &&
          responseData.data.getAllTimeline.timeline[0]!.pinnedEventIds &&
          responseData.data.getAllTimeline.timeline[0]!.pinnedEventIds.length > 0 &&
          responseData.data.getAllTimeline.timeline[0]!.pinnedEventIds![0] != null
        ) {
          const response = await client.mutate<any>({
            mutation: persistTimelinePinnedEventMutation,
            variables: {
              pinnedEventId: responseData.data.getAllTimeline.timeline[0]!.pinnedEventIds![0],
              eventId: 'bv4QSGsB9v5HJNSH-7fi',
            },
          });

          expect(response.data!.persistPinnedEventOnTimeline).to.be(null);
        }
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default pinnedEventsPersistenceTests;
