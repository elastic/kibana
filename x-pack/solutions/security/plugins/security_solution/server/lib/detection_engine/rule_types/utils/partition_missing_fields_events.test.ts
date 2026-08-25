/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partitionMissingFieldsEvents } from './partition_missing_fields_events';

describe('partitionMissingFieldsEvents', () => {
  it('should partition if one field is empty', () => {
    expect(
      partitionMissingFieldsEvents(
        [
          {
            fields: {
              'agent.host': 'host-1',
              'agent.type': ['test-1', 'test-2'],
              'agent.version': 2,
            },
            _id: '1',
            _index: 'index-0',
          },
          {
            fields: {
              'agent.host': 'host-1',
              'agent.type': ['test-1', 'test-2'],
            },
            _id: '1',
            _index: 'index-0',
          },
        ],
        ['agent.host', 'agent.type', 'agent.version'],
        ['fields']
      )
    ).toEqual([
      [
        {
          fields: {
            'agent.host': 'host-1',
            'agent.type': ['test-1', 'test-2'],
            'agent.version': 2,
          },
          _id: '1',
          _index: 'index-0',
        },
      ],
      [
        {
          fields: {
            'agent.host': 'host-1',
            'agent.type': ['test-1', 'test-2'],
          },
          _id: '1',
          _index: 'index-0',
        },
      ],
    ]);
  });
  it('should partition when fields objects located in event property', () => {
    expect(
      partitionMissingFieldsEvents(
        [
          {
            event: {
              fields: {
                'agent.host': 'host-1',
                'agent.type': ['test-1', 'test-2'],
                'agent.version': 2,
              },
              _id: '1',
              _index: 'index-0',
            },
          },
          {
            event: {
              fields: {
                'agent.host': 'host-1',
                'agent.type': ['test-1', 'test-2'],
              },
              _id: '1',
              _index: 'index-0',
            },
          },
        ],
        ['agent.host', 'agent.type', 'agent.version'],
        ['event', 'fields']
      )
    ).toEqual([
      [
        {
          event: {
            fields: {
              'agent.host': 'host-1',
              'agent.type': ['test-1', 'test-2'],
              'agent.version': 2,
            },
            _id: '1',
            _index: 'index-0',
          },
        },
      ],
      [
        {
          event: {
            fields: {
              'agent.host': 'host-1',
              'agent.type': ['test-1', 'test-2'],
            },
            _id: '1',
            _index: 'index-0',
          },
        },
      ],
    ]);
  });
  it('should partition when fields located in root of event', () => {
    expect(
      partitionMissingFieldsEvents(
        [
          {
            'agent.host': 'host-1',
            'agent.version': 2,
          },
          {
            'agent.host': 'host-1',
          },
        ],
        ['agent.host', 'agent.version'],
        []
      )
    ).toEqual([
      [
        {
          'agent.host': 'host-1',
          'agent.version': 2,
        },
      ],
      [
        {
          'agent.host': 'host-1',
        },
      ],
    ]);
  });
  it('should partition if two fields are empty', () => {
    expect(
      partitionMissingFieldsEvents(
        [
          {
            fields: {
              'agent.type': ['test-1', 'test-2'],
            },
            _id: '1',
            _index: 'index-0',
          },
        ],
        ['agent.host', 'agent.type', 'agent.version'],
        ['fields']
      )
    ).toEqual([
      [],
      [
        {
          fields: {
            'agent.type': ['test-1', 'test-2'],
          },
          _id: '1',
          _index: 'index-0',
        },
      ],
    ]);
  });
  it('should partition if all fields are empty', () => {
    expect(
      partitionMissingFieldsEvents(
        [
          {
            fields: {
              'some.field': 0,
            },
            _id: '1',
            _index: 'index-0',
          },
        ],
        ['agent.host', 'agent.type', 'agent.version'],
        ['fields']
      )
    ).toEqual([
      [],
      [
        {
          fields: {
            'some.field': 0,
          },
          _id: '1',
          _index: 'index-0',
        },
      ],
    ]);
  });
});
