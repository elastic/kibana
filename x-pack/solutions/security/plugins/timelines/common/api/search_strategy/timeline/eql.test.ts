/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineEqlRequestOptionsSchema } from './eql';
import { mockBaseTimelineRequest } from './mocks/base_timeline_request';

const mockEqlRequestOptions = {
  ...mockBaseTimelineRequest,
  filterQuery: 'sequence\n[any where true]\n[any where true]',
  eventCategoryField: 'event.category',
  tiebreakerField: '',
  fieldRequested: [
    '@timestamp',
    'message',
    'event.category',
    'event.action',
    'host.name',
    'source.ip',
    'destination.ip',
    'user.name',
    '@timestamp',
    'kibana.alert.workflow_status',
    'kibana.alert.workflow_tags',
    'kibana.alert.workflow_assignee_ids',
    'kibana.alert.group.id',
    'kibana.alert.original_time',
    'kibana.alert.building_block_type',
    'kibana.alert.rule.from',
    'kibana.alert.rule.name',
    'kibana.alert.rule.to',
    'kibana.alert.rule.uuid',
    'kibana.alert.rule.rule_id',
    'kibana.alert.rule.type',
    'kibana.alert.suppression.docs_count',
    'kibana.alert.original_event.kind',
    'kibana.alert.original_event.module',
    'file.path',
    'file.Ext.code_signature.subject_name',
    'file.Ext.code_signature.trusted',
    'file.hash.sha256',
    'host.os.family',
    'event.code',
    'process.entry_leader.entity_id',
  ],
  language: 'eql',
  pagination: {
    activePage: 0,
    querySize: 25,
  },
  runtimeMappings: {},
  size: 100,
  sort: [
    {
      direction: 'asc',
      esTypes: ['date'],
      field: '@timestamp',
      type: 'date',
    },
  ],
  timerange: {
    from: '2018-02-12T20:39:22.229Z',
    interval: '12h',
    to: '2024-02-13T20:39:22.229Z',
  },
  timestampField: '@timestamp',
};

describe('timelineEqlRequestOptionsSchema', () => {
  it('should correctly parse the last eql request object without unknown fields', () => {
    expect(timelineEqlRequestOptionsSchema.parse(mockEqlRequestOptions)).toEqual(
      mockEqlRequestOptions
    );
  });

  it('should correctly parse the last eql request object and remove unknown fields', () => {
    const invalidEqlRequest = {
      ...mockEqlRequestOptions,
      unknownField: 'should-be-removed',
    };
    expect(timelineEqlRequestOptionsSchema.parse(invalidEqlRequest)).toEqual(mockEqlRequestOptions);
  });

  it('should correctly error if an incorrect field type is provided for a schema key', () => {
    const invalidEqlRequest = {
      ...mockEqlRequestOptions,
      fieldRequested: 123,
    };

    expect(() => {
      timelineEqlRequestOptionsSchema.parse(invalidEqlRequest);
    }).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"invalid_type\\",
          \\"expected\\": \\"array\\",
          \\"received\\": \\"number\\",
          \\"path\\": [
            \\"fieldRequested\\"
          ],
          \\"message\\": \\"Expected array, received number\\"
        }
      ]"
    `);
  });
});
