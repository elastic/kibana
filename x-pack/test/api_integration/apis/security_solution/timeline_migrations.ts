/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiResponse, estypes } from '@elastic/elasticsearch';
import { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import expect from '@kbn/expect';
import {
  SavedTimeline,
  TimelineType,
} from '../../../../plugins/security_solution/common/types/timeline';

import { FtrProviderContext } from '../../ftr_provider_context';
import { createBasicTimeline, createBasicTimelineTemplate } from './saved_objects/helpers';

type TimelineFromES = ApiResponse<
  estypes.SearchResponse<{
    'siem-ui-timeline': Omit<SavedTimeline, 'savedQueryId'>;
  }>,
  unknown
>;

async function getTimelineSavedObjectFromES(
  es: KibanaClient,
  query?: object
): Promise<TimelineFromES> {
  const timelines: ApiResponse<
    estypes.SearchResponse<{ 'siem-ui-timeline': Omit<SavedTimeline, 'savedQueryId'> }>
  > = await es.search({
    index: '.kibana',
    body: {
      query: {
        bool: {
          filter: [
            { ...query },
            {
              term: {
                type: {
                  value: 'siem-ui-timeline',
                },
              },
            },
          ],
        },
      },
    },
  });

  return timelines;
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Timeline migrations', () => {
    const esArchiver = getService('esArchiver');
    const es = getService('es');

    describe('7.16.0', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/security_solution/timelines/7.15.0'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/timelines/7.15.0'
        );
      });

      it('removes the savedQueryId', async () => {
        const timelines = await getTimelineSavedObjectFromES(es, {
          ids: { values: ['siem-ui-timeline:8dc70950-1012-11ec-9ad3-2d7c6600c0f7'] },
        });

        expect(timelines.body.hits.hits[0]._source?.['siem-ui-timeline']).to.not.have.property(
          'savedQueryId'
        );
      });

      it('preserves the title in the saved object after migration', async () => {
        const resp = await supertest
          .get('/api/timeline')
          .query({ id: '8dc70950-1012-11ec-9ad3-2d7c6600c0f7' })
          .set('kbn-xsrf', 'true');

        expect(resp.body.data.getOneTimeline.title).to.be('Awesome Timeline');
      });

      it('returns the savedQueryId in the response', async () => {
        const resp = await supertest
          .get('/api/timeline')
          .query({ id: '8dc70950-1012-11ec-9ad3-2d7c6600c0f7' })
          .set('kbn-xsrf', 'true');

        expect(resp.body.data.getOneTimeline.savedQueryId).to.be("It's me");
      });
    });
  });
}
