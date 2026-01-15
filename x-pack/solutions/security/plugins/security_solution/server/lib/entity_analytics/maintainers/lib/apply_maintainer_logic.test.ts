/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import { processResponse } from './apply_maintainer_logic';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { AccessFrequencyEntityMaintainer } from '../definitions/access_frequency';

describe('processResponse', () => {
  it('should process response correctly', async () => {
    const mockResponse: EsqlEsqlResult = {
      took: 189,
      is_partial: false,
      completion_time_in_millis: 1768321323769,
      documents_found: 503209,
      values_loaded: 1006418,
      start_time_in_millis: 1768321323580,
      expiration_time_in_millis: 1768753323669,
      columns: [
        {
          name: 'accessed_frequently_by',
          type: 'keyword',
        },
        {
          name: 'accessed_infrequently_by',
          type: 'keyword',
        },
        {
          name: 'host.name',
          type: 'keyword',
        },
      ],
      values: [
        ['root', ['adm', 'dip', 'docker', 'google-sudoers', 'plugdev', 'video'], 'host-1'],
        ['root', ['adm', 'dip', 'docker', 'google-sudoers', 'plugdev', 'video'], 'host-2'],
        [
          ['root', 'user-1'],
          [
            'adm',
            'audio',
            'cdrom',
            'dialout',
            'dip',
            'floppy',
            'google-sudoers',
            'lxd',
            'netdev',
            'plugdev',
            'ubuntu',
            'video',
          ],
          'host-3',
        ],
      ],
    };
    expect(
      processResponse({
        entityType: EntityType.host,
        response: mockResponse,
        maintainerDef: AccessFrequencyEntityMaintainer,
      })
    ).toEqual([
      {
        type: 'host',
        record: {
          id: 'host-1',
          relationships: {
            accessed_frequently_by: ['root'],
            accessed_infrequently_by: [
              'adm',
              'dip',
              'docker',
              'google-sudoers',
              'plugdev',
              'video',
            ],
          },
        },
      },
      {
        type: 'host',
        record: {
          id: 'host-2',
          relationships: {
            accessed_frequently_by: ['root'],
            accessed_infrequently_by: [
              'adm',
              'dip',
              'docker',
              'google-sudoers',
              'plugdev',
              'video',
            ],
          },
        },
      },
      {
        type: 'host',
        record: {
          id: 'host-3',
          relationships: {
            accessed_frequently_by: ['root', 'user-1'],
            accessed_infrequently_by: [
              'adm',
              'audio',
              'cdrom',
              'dialout',
              'dip',
              'floppy',
              'google-sudoers',
              'lxd',
              'netdev',
              'plugdev',
              'ubuntu',
              'video',
            ],
          },
        },
      },
    ]);
  });
});
