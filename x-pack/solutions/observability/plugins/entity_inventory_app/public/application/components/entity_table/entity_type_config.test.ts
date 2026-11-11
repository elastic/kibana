/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOST_TYPE_FIXTURE,
  K8S_DEPLOYMENT_TYPE_FIXTURE,
} from '../../../inventory_api/fixture_data';
import type { InventoryListColumn } from '../../../inventory_api/types';
import {
  ENTITY_TYPE_BY_CATEGORY,
  NAME_COLUMN_ID,
  NAMESPACE_COLUMN_ID,
  CLUSTER_COLUMN_ID,
  getColumnIds,
  getColumnValue,
  getDefaultVisibleColumns,
  getDisplayConfig,
  getFirstValue,
} from './entity_type_config';
import { COLUMN_LABELS, getColumnLabel } from './column_labels';

const toListColumns = (names: string[]): InventoryListColumn[] =>
  names.map((name) => ({ name, kind: 'attribute' }));

describe('entity type config', () => {
  it('maps the hosts and kubernetes categories to a type and leaves all resources unmapped', () => {
    expect(ENTITY_TYPE_BY_CATEGORY.hosts).toBe('host');
    expect(ENTITY_TYPE_BY_CATEGORY.kubernetes).toBe('k8s.deployment');
    expect(ENTITY_TYPE_BY_CATEGORY.all).toBeUndefined();
  });

  it('shows the host default columns in the spec order, Name first', () => {
    const columns = toListColumns(HOST_TYPE_FIXTURE.columns.map(({ name }) => name));

    // Last seen stands in for Up time until the metrics exist.
    expect(getDefaultVisibleColumns('host', columns)).toEqual([
      NAME_COLUMN_ID,
      'cloud.account.id',
      'last_seen',
    ]);
  });

  it('leaves out a host default column that the response does not have', () => {
    const columns = toListColumns(
      HOST_TYPE_FIXTURE.columns
        .map(({ name }) => name)
        .filter((name) => name !== 'cloud.account.id')
    );

    expect(getDefaultVisibleColumns('host', columns)).toEqual([NAME_COLUMN_ID, 'last_seen']);
  });

  it('shows Name, the attributes and last seen for a type without display config', () => {
    const columns: InventoryListColumn[] = [
      { name: 'entity.id', kind: 'id' },
      { name: 'service.name', kind: 'identity' },
      { name: 'service.language', kind: 'attribute' },
      { name: 'last_seen', kind: 'last_seen' },
    ];

    expect(getDisplayConfig('service')).toEqual(
      expect.objectContaining({ iconType: 'grid', nameFields: ['entity.id'] })
    );
    expect(getDefaultVisibleColumns('service', columns)).toEqual([
      NAME_COLUMN_ID,
      'service.language',
      'last_seen',
    ]);
  });

  it('shows the k8s.deployment default columns in the spec order, Name first', () => {
    expect(getDefaultVisibleColumns('k8s.deployment', K8S_DEPLOYMENT_TYPE_FIXTURE.columns)).toEqual(
      [NAME_COLUMN_ID, NAMESPACE_COLUMN_ID, CLUSTER_COLUMN_ID, 'available_replicas', 'last_seen']
    );
  });

  describe('getColumnValue for a deployment', () => {
    const { nameFields, mergedColumns } = getDisplayConfig('k8s.deployment');
    const config = { nameFields, mergedColumns };
    const row = {
      'entity.id': 'prod/payments/frontend',
      'k8s.deployment.name': 'frontend',
      'kubernetes.deployment.name': 'frontend-ea',
      'k8s.namespace.name': 'payments',
      'kubernetes.namespace': 'payments-ea',
      'k8s.cluster.name': 'prod',
      'orchestrator.cluster.name': 'prod-ea',
      available_replicas: 3,
    };

    it('names the deployment from the OpenTelemetry field first, then the Elastic Agent one', () => {
      expect(getColumnValue(row, NAME_COLUMN_ID, config)).toBe('frontend');
      expect(getColumnValue({ ...row, 'k8s.deployment.name': null }, NAME_COLUMN_ID, config)).toBe(
        'frontend-ea'
      );
    });

    it('merges the namespace reported under either naming convention', () => {
      expect(getColumnValue(row, NAMESPACE_COLUMN_ID, config)).toBe('payments');
      expect(
        getColumnValue({ ...row, 'k8s.namespace.name': null }, NAMESPACE_COLUMN_ID, config)
      ).toBe('payments-ea');
      expect(getColumnValue({}, NAMESPACE_COLUMN_ID, config)).toBeNull();
    });

    it('merges the cluster reported under either naming convention', () => {
      expect(getColumnValue(row, CLUSTER_COLUMN_ID, config)).toBe('prod');
      expect(getColumnValue({ ...row, 'k8s.cluster.name': null }, CLUSTER_COLUMN_ID, config)).toBe(
        'prod-ea'
      );
      expect(getColumnValue({}, CLUSTER_COLUMN_ID, config)).toBeNull();
    });

    it('returns any other column as it is', () => {
      expect(getColumnValue(row, 'available_replicas', config)).toBe(3);
    });
  });

  it('shows the Cluster column even when the response has no cluster attribute', () => {
    const columns = toListColumns(['k8s.cluster.name', 'available_replicas']);

    expect(getDefaultVisibleColumns('k8s.deployment', columns)).toContain(CLUSTER_COLUMN_ID);
  });

  describe('getColumnIds', () => {
    const toColumns = (type: { columns: Array<{ name: string }> }) =>
      toListColumns(type.columns.map(({ name }) => name));

    it('lists the host columns in the design order, then the rest in response order', () => {
      const ids = getColumnIds('host', toColumns(HOST_TYPE_FIXTURE));

      expect(ids.slice(0, 4)).toEqual([
        NAME_COLUMN_ID,
        'cloud.account.id',
        'last_seen',
        'cloud.provider',
      ]);
      expect(ids.slice(4)).toEqual(
        HOST_TYPE_FIXTURE.columns
          .map(({ name }) => name)
          .filter((name) => !ids.slice(0, 4).includes(name))
      );
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('lists the deployment columns with the cluster after the name', () => {
      const ids = getColumnIds('k8s.deployment', toColumns(K8S_DEPLOYMENT_TYPE_FIXTURE));

      expect(ids.slice(0, 5)).toEqual([
        NAME_COLUMN_ID,
        CLUSTER_COLUMN_ID,
        NAMESPACE_COLUMN_ID,
        'available_replicas',
        'last_seen',
      ]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('skips an ordered column that the response does not have', () => {
      expect(getColumnIds('host', toListColumns(['host.name', 'last_seen']))).toEqual([
        NAME_COLUMN_ID,
        'last_seen',
        'host.name',
      ]);
    });

    it('keeps the Name column, the merged columns and the response order for an unconfigured type', () => {
      expect(getColumnIds('service', toListColumns(['entity.id', 'service.name']))).toEqual([
        NAME_COLUMN_ID,
        'entity.id',
        'service.name',
      ]);
    });
  });

  it('has no merged columns for types that do not configure any', () => {
    expect(getDisplayConfig('host').mergedColumns).toEqual({});
    expect(getDisplayConfig('service').mergedColumns).toEqual({});
  });

  it('uses the type icons of host and k8s.deployment', () => {
    expect(getDisplayConfig('host').iconType).toBe('compute');
    expect(getDisplayConfig('k8s.deployment').iconType).toBe('logoKubernetes');
  });

  describe('getFirstValue', () => {
    const { nameFields } = getDisplayConfig('host');
    const row = {
      'entity.id': 'host:abc',
      'host.id': 'abc',
      'host.name': 'web-001',
      'host.hostname': 'web-001.internal',
    };

    it('prefers the first name field with a value', () => {
      expect(getFirstValue(row, nameFields)).toBe('web-001');
    });

    it('falls back through the name fields in order', () => {
      expect(getFirstValue({ ...row, 'host.name': null }, nameFields)).toBe('web-001.internal');
      expect(getFirstValue({ ...row, 'host.name': null, 'host.hostname': null }, nameFields)).toBe(
        'abc'
      );
      expect(
        getFirstValue(
          { ...row, 'host.name': null, 'host.hostname': null, 'host.id': null },
          nameFields
        )
      ).toBe('host:abc');
    });

    it('takes the first value of a multi-value field', () => {
      expect(getFirstValue({ ...row, 'host.name': ['web-a', 'web-b'] }, nameFields)).toBe('web-a');
    });

    it('returns null when no name field has a value', () => {
      expect(getFirstValue({}, nameFields)).toBeNull();
    });
  });

  it('labels known columns and falls back to the raw column name', () => {
    expect(getColumnLabel(NAME_COLUMN_ID)).toBe(COLUMN_LABELS[NAME_COLUMN_ID]);
    expect(getColumnLabel('host.ip')).toBe(COLUMN_LABELS['host.ip']);
    expect(getColumnLabel('service.language')).toBe('service.language');
  });
});
