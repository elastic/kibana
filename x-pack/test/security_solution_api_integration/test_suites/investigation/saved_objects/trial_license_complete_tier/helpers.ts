/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { TimelineTypeEnum } from '@kbn/security-solution-plugin/common/api/timeline';
import { NOTE_URL } from '@kbn/security-solution-plugin/common/constants';
import type { Client } from '@elastic/elasticsearch';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { noteSavedObjectType } from '@kbn/security-solution-plugin/server/lib/timeline/saved_object_mappings';

export const createBasicTimeline = async (supertest: SuperTest.Agent, titleToSaved: string) =>
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
  supertest: SuperTest.Agent,
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
        templateTimelineId: uuidv4(),
        templateTimelineVersion: 1,
        timelineType: TimelineTypeEnum.template,
      },
    });

export const deleteAllNotes = async (es: Client): Promise<void> => {
  await es.deleteByQuery({
    index: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
    q: `type:${noteSavedObjectType}`,
    wait_for_completion: true,
    refresh: true,
    body: {},
  });
};

export const createNoteAssociatedWithDocumentOnly = async (
  supertest: SuperTest.Agent,
  documentId: string,
  noteText: string
) =>
  await supertest
    .patch(NOTE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      note: {
        eventId: documentId,
        timelineId: '',
        created: Date.now(),
        createdBy: 'elastic',
        updated: Date.now(),
        updatedBy: 'elastic',
        note: noteText,
      },
    });

export const createNoteAssociatedWithSavedObjectOnly = async (
  supertest: SuperTest.Agent,
  savedObjectId: string,
  noteText: string
) =>
  await supertest
    .patch(NOTE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      note: {
        eventId: '',
        timelineId: savedObjectId,
        created: Date.now(),
        createdBy: 'elastic',
        updated: Date.now(),
        updatedBy: 'elastic',
        note: noteText,
      },
    });

export const createNoteAssociatedWithDocumentAndSavedObject = async (
  supertest: SuperTest.Agent,
  documentId: string,
  savedObjectId: string,
  noteText: string
) =>
  await supertest
    .patch(NOTE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      note: {
        eventId: documentId,
        timelineId: savedObjectId,
        created: Date.now(),
        createdBy: 'elastic',
        updated: Date.now(),
        updatedBy: 'elastic',
        note: noteText,
      },
    });

export const createNoteAssociatedWithNothing = async (
  supertest: SuperTest.Agent,
  noteText: string
) =>
  await supertest
    .patch(NOTE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      note: {
        eventId: '',
        timelineId: '',
        created: Date.now(),
        createdBy: 'elastic',
        updated: Date.now(),
        updatedBy: 'elastic',
        note: noteText,
      },
    });
