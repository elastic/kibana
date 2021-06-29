/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  SavedTimeline,
  TimelineType,
} from '../../../../plugins/security_solution/common/types/timeline';

import { FtrProviderContext } from '../../ftr_provider_context';
import { createBasicTimeline, createBasicTimelineTemplate } from './saved_objects/helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Timeline', () => {
    it('Make sure that we get Timeline data', async () => {
      const titleToSaved = 'hello timeline';
      await createBasicTimeline(supertest, titleToSaved);

      const resp = await supertest.get('/api/timelines').set('kbn-xsrf', 'true');

      const timelines = resp.body.timeline;

      expect(timelines.length).to.greaterThan(0);
    });

    it('Make sure that pagination is working in Timeline query', async () => {
      const titleToSaved = 'hello timeline';
      await createBasicTimeline(supertest, titleToSaved);

      const resp = await supertest
        .get('/api/timelines?page_size=1&page_index=1')
        .set('kbn-xsrf', 'true');

      const timelines = resp.body.timeline;

      expect(timelines.length).to.equal(1);
    });

    it('Make sure that we get Timeline template data', async () => {
      const titleToSaved = 'hello timeline template';
      await createBasicTimelineTemplate(supertest, titleToSaved);

      const resp = await supertest
        .get('/api/timelines?timeline_type=template')
        .set('kbn-xsrf', 'true');

      const templates: SavedTimeline[] = resp.body.timeline;

      expect(templates.length).to.greaterThan(0);
      expect(templates.filter((t) => t.timelineType === TimelineType.default).length).to.equal(0);
    });
  });
}
