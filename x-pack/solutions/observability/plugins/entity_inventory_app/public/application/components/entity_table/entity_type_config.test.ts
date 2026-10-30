/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HOST_TYPE_FIXTURE } from '../../../inventory_api/fixtures';
import type { InventoryListColumn } from '../../../inventory_api/types';
import {
  ENTITY_TYPE_BY_CATEGORY,
  NAME_COLUMN_ID,
  getDefaultVisibleColumns,
  getDisplayConfig,
  getEntityName,
} from './entity_type_config';
import { COLUMN_LABELS, getColumnLabel } from './translations';

const toListColumns = (names: string[]): InventoryListColumn[] =>
  names.map((name) => ({ name, kind: 'attribute', type: 'keyword' }));

describe('entity type config', () => {
  it('maps the hosts and kubernetes categories to a type and leaves all resources unmapped', () => {
    expect(ENTITY_TYPE_BY_CATEGORY.hosts).toBe('host');
    expect(ENTITY_TYPE_BY_CATEGORY.kubernetes).toBe('k8s.deployment');
    expect(ENTITY_TYPE_BY_CATEGORY.all).toBeUndefined();
  });

  it('shows the host default columns that the response has, Name first', () => {
    const columns = toListColumns(
      HOST_TYPE_FIXTURE.columns
        .map(({ name }) => name)
        .filter((name) => name !== 'k8s.cluster.name')
    );

    expect(getDefaultVisibleColumns('host', columns)).toEqual([
      NAME_COLUMN_ID,
      'host.ip',
      'os.name',
      'os.version',
      'host.arch',
      'cloud.provider',
      'cloud.region',
      'last_seen',
    ]);
  });

  it('shows Name, the attributes and last seen for a type without display config', () => {
    const columns: InventoryListColumn[] = [
      { name: 'entity.id', kind: 'id', type: 'keyword' },
      { name: 'service.name', kind: 'identity', type: 'keyword' },
      { name: 'service.language', kind: 'attribute', type: 'keyword' },
      { name: 'last_seen', kind: 'last_seen', type: 'date' },
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

  it('uses the type icons of host and k8s.deployment', () => {
    expect(getDisplayConfig('host').iconType).toBe('compute');
    expect(getDisplayConfig('k8s.deployment').iconType).toBe('logoKubernetes');
  });

  describe('getEntityName', () => {
    const { nameFields } = getDisplayConfig('host');
    const row = {
      'entity.id': 'host:abc',
      'host.id': 'abc',
      'host.name': 'web-001',
      'host.hostname': 'web-001.internal',
    };

    it('prefers the first name field with a value', () => {
      expect(getEntityName(row, nameFields)).toBe('web-001');
    });

    it('falls back through the name fields in order', () => {
      expect(getEntityName({ ...row, 'host.name': null }, nameFields)).toBe('web-001.internal');
      expect(getEntityName({ ...row, 'host.name': null, 'host.hostname': null }, nameFields)).toBe(
        'abc'
      );
      expect(
        getEntityName(
          { ...row, 'host.name': null, 'host.hostname': null, 'host.id': null },
          nameFields
        )
      ).toBe('host:abc');
    });

    it('takes the first value of a multi-value field', () => {
      expect(getEntityName({ ...row, 'host.name': ['web-a', 'web-b'] }, nameFields)).toBe('web-a');
    });

    it('returns null when no name field has a value', () => {
      expect(getEntityName({}, nameFields)).toBeNull();
    });
  });

  it('labels known columns and falls back to the raw column name', () => {
    expect(getColumnLabel(NAME_COLUMN_ID)).toBe(COLUMN_LABELS[NAME_COLUMN_ID]);
    expect(getColumnLabel('host.ip')).toBe(COLUMN_LABELS['host.ip']);
    expect(getColumnLabel('service.language')).toBe('service.language');
  });
});
