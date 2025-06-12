/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../../../../common/constants';
import { GroupSummary } from '@kbn/slo-schema';
import { useGroupName } from './use_group_name';

describe('useGroupName', () => {
  it('returns the group name for ungrouped', () => {
    const groupName = useGroupName('ungrouped', 'irrelevant', {} as GroupSummary);
    expect(groupName).toBe('irrelevant');
  });

  it('returns the group name for slo tags', () => {
    const groupName = useGroupName('slo.tags', 'some-tag', {} as GroupSummary);
    expect(groupName).toBe('some-tag');
  });

  it('returns the group name for status', () => {
    const groupName = useGroupName('status', 'HEALTHY', {} as GroupSummary);
    expect(groupName).toBe('healthy');
  });

  it('returns the group name for slo instanceId', () => {
    const summary = {
      total: 2,
      violated: 0,
      healthy: 2,
      degrading: 0,
      noData: 0,
      worst: {
        sliValue: 1,
        status: 'healthy',
        slo: {
          id: 'slo-id',
          name: 'slo-name',
          instanceId: 'domain.com',
          groupings: {
            host: {
              name: 'domain.com',
            },
          },
        },
      },
    } as GroupSummary;
    const groupName = useGroupName('slo.instanceId', 'domain.com', summary);
    expect(groupName).toBe('host.name: domain.com');
  });

  it('returns the group name for slo indicator type', () => {
    const groupName = useGroupName('slo.indicator.type', 'sli.kql.custom', {} as GroupSummary);
    expect(groupName).toBe('Custom Query');
  });

  it('returns the group name for local index', () => {
    const groupName = useGroupName('_index', SUMMARY_DESTINATION_INDEX_PATTERN, {} as GroupSummary);
    expect(groupName).toBe('Local Kibana');
  });

  it('returns the group name for remote index', () => {
    const groupName = useGroupName(
      '_index',
      `my-remote-cluster:${SUMMARY_DESTINATION_INDEX_PATTERN}`,
      {} as GroupSummary
    );
    expect(groupName).toBe('Remote Cluster: my-remote-cluster');
  });
});
