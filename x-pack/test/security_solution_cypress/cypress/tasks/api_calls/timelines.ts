/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineResponse } from '@kbn/security-solution-plugin/common/api/timeline';
import type { CompleteTimeline } from '../../objects/timeline';
import { rootRequest } from '../common';

export const createTimeline = (timeline: CompleteTimeline) =>
  rootRequest<TimelineResponse>({
    method: 'POST',
    url: 'api/timeline',
    body: {
      timeline: {
        columns: [
          {
            id: '@timestamp',
          },
          {
            id: 'user.name',
          },
          {
            id: 'event.category',
          },
          {
            id: 'event.action',
          },
          {
            id: 'host.name',
          },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: timeline.query,
              kind: 'kuery',
            },
          },
        },
        dateRange: {
          end: '2022-04-01T12:22:56.000Z',
          start: '2018-01-01T12:22:56.000Z',
        },
        description: timeline.description,
        title: timeline.title,
        savedQueryId: null,
        ...(timeline.dataViewId != null && timeline.indexNames != null
          ? { dataViewId: timeline.dataViewId, indexNames: timeline.indexNames }
          : {}),
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
  });

export const createTimelineTemplate = (timeline: CompleteTimeline) =>
  rootRequest<TimelineResponse>({
    method: 'POST',
    url: 'api/timeline',
    body: {
      timeline: {
        columns: [
          {
            id: '@timestamp',
          },
          {
            id: 'user.name',
          },
          {
            id: 'event.category',
          },
          {
            id: 'event.action',
          },
          {
            id: 'host.name',
          },
        ],
        kqlMode: 'filter',
        kqlQuery: {
          filterQuery: {
            kuery: {
              expression: timeline.query,
              kind: 'kuery',
            },
          },
        },
        dateRange: {
          end: '1577881376000',
          start: '1514809376000',
        },
        description: timeline.description,
        title: timeline.title,
        templateTimelineVersion: 1,
        timelineType: 'template',
        savedQueryId: null,
      },
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
  });

export const loadPrepackagedTimelineTemplates = () =>
  rootRequest({
    method: 'POST',
    url: 'api/timeline/_prepackaged',
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
  });

export const favoriteTimeline = ({
  timelineId,
  timelineType,
  templateTimelineId,
  templateTimelineVersion,
}: {
  timelineId: string;
  timelineType: string;
  templateTimelineId?: string;
  templateTimelineVersion?: number;
}) =>
  rootRequest({
    method: 'PATCH',
    url: 'api/timeline/_favorite',
    body: {
      timelineId,
      timelineType,
      templateTimelineId: templateTimelineId || null,
      templateTimelineVersion: templateTimelineVersion || null,
    },
    headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
  });
