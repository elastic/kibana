/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import uuid from 'uuid';
import { TimelineType } from '@kbn/security-solution-plugin/common/types/timeline';

export const createBasicTimeline = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  titleToSaved: string
) =>
  await supertest
    .post('/api/timeline')
    .set('kbn-xsrf', 'true')
    .send({
      timelineId: null,
      version: null,
      timeline: {
        title: titleToSaved,
      },
    });

export const createBasicTimelineTemplate = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  titleToSaved: string
) =>
  await supertest
    .post('/api/timeline')
    .set('kbn-xsrf', 'true')
    .send({
      timelineId: null,
      version: null,
      timeline: {
        title: titleToSaved,
        templateTimelineId: uuid.v4(),
        templateTimelineVersion: 1,
        timelineType: TimelineType.template,
      },
    });
