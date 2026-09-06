/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEuidDslFilterBasedOnDocument,
  getEuidNamespaceSourceFields,
} from '@kbn/entity-store/common/domain/euid';
import {
  getSourceFieldsFromNode,
  getEntityTypeFromNodeId,
  getEntityExpandItems,
  fieldForRole,
  getEntityFilterSpec,
  getRelatedEventsFilter,
} from './get_entity_expand_items';
import type { EntityFilterActions, EuidFilterApi } from './get_entity_expand_items';
import type { NodeViewModel } from '../../types';

// Exercise the real Entity Store EUID logic rather than a stub, so these tests fail if the
// entity definitions' ranking or namespace evaluation changes.
const euidApi: EuidFilterApi = {
  dsl: { getEuidFilterBasedOnDocument: getEuidDslFilterBasedOnDocument },
  getEuidNamespaceSourceFields,
};

describe('getSourceFieldsFromNode', () => {
  it('returns sourceFields from the first document entity', () => {
    const node = {
      documentsData: [
        {
          id: 'doc1',
          type: 'entity',
          entity: {
            engine_type: 'user',
            sourceFields: { 'user.id': 'admin', 'user.email': 'admin@example.com' },
          },
        },
      ],
    };
    expect(getSourceFieldsFromNode(node as unknown as NodeViewModel)).toEqual({
      'user.id': 'admin',
      'user.email': 'admin@example.com',
    });
  });

  it('returns merged multi-value sourceFields from deduplicated document', () => {
    const node = {
      documentsData: [
        {
          id: 'user:admin@gcp',
          type: 'entity',
          entity: {
            engine_type: 'user',
            sourceFields: {
              'user.email': 'admin@example.com',
              'user.id': ['id-1', 'id-2'],
            },
          },
        },
      ],
    };
    expect(getSourceFieldsFromNode(node as unknown as NodeViewModel)).toEqual({
      'user.email': 'admin@example.com',
      'user.id': ['id-1', 'id-2'],
    });
  });

  it('returns undefined when documentsData is empty', () => {
    const node = { documentsData: [] };
    expect(getSourceFieldsFromNode(node as unknown as NodeViewModel)).toBeUndefined();
  });

  it('returns undefined when entity has no sourceFields', () => {
    const node = {
      documentsData: [{ id: 'doc1', type: 'entity', entity: { name: 'test' } }],
    };
    expect(getSourceFieldsFromNode(node as unknown as NodeViewModel)).toBeUndefined();
  });

  it('returns undefined when node has no documentsData', () => {
    const node = { id: 'test' };
    expect(getSourceFieldsFromNode(node as unknown as NodeViewModel)).toBeUndefined();
  });
});

describe('getEntityTypeFromNodeId', () => {
  it('extracts user type from EUID', () => {
    expect(getEntityTypeFromNodeId('user:admin@example.com@gcp')).toBe('user');
  });

  it('extracts host type from EUID', () => {
    expect(getEntityTypeFromNodeId('host:my-host')).toBe('host');
  });

  it('extracts service type from EUID', () => {
    expect(getEntityTypeFromNodeId('service:my-service')).toBe('service');
  });

  it('returns entity for generic node IDs (no colon)', () => {
    expect(getEntityTypeFromNodeId('some-entity-id')).toBe('entity');
  });
});

describe('fieldForRole', () => {
  it('returns actor namespace field for actor role', () => {
    expect(fieldForRole('user.id', 'actor')).toBe('user.id');
  });

  it('strips target namespace for actor role', () => {
    expect(fieldForRole('user.target.id', 'actor')).toBe('user.id');
  });

  it('transforms to target namespace for target role', () => {
    expect(fieldForRole('user.id', 'target')).toBe('user.target.id');
  });

  it('keeps target namespace for target role', () => {
    expect(fieldForRole('user.target.id', 'target')).toBe('user.target.id');
  });

  it('handles nested fields', () => {
    expect(fieldForRole('user.email', 'target')).toBe('user.target.email');
    expect(fieldForRole('host.hostname', 'target')).toBe('host.target.hostname');
  });

  it('returns single-segment fields unchanged', () => {
    expect(fieldForRole('hostname', 'actor')).toBe('hostname');
    expect(fieldForRole('hostname', 'target')).toBe('hostname');
  });
});

describe('getEntityExpandItems entity filter actions', () => {
  const createMockEntityFilterActions = (
    overrides: Partial<EntityFilterActions> = {}
  ): EntityFilterActions => ({
    toggleEntityFilter: jest.fn(),
    isEntityFilterActive: jest.fn().mockReturnValue(false),
    toggleRelatedEvents: jest.fn(),
    isRelatedEventsActive: jest.fn().mockReturnValue(false),
    ...overrides,
  });

  it('calls toggleEntityFilter with actor role when "Show actions by entity" is clicked', () => {
    const entityFilterActions = createMockEntityFilterActions();

    const items = getEntityExpandItems({
      nodeId: 'user:admin@example.com@gcp',
      entityFilterActions,
      shouldRender: { showActionsByEntity: true },
    });

    expect(items).toHaveLength(1);
    const item = items[0] as { onClick: () => void };
    item.onClick();

    expect(entityFilterActions.toggleEntityFilter).toHaveBeenCalledWith('actor', 'show');
  });

  it('calls toggleEntityFilter with target role when "Show actions on entity" is clicked', () => {
    const entityFilterActions = createMockEntityFilterActions();

    const items = getEntityExpandItems({
      nodeId: 'host:my-host',
      entityFilterActions,
      shouldRender: { showActionsOnEntity: true },
    });

    expect(items).toHaveLength(1);
    const item = items[0] as { onClick: () => void };
    item.onClick();

    expect(entityFilterActions.toggleEntityFilter).toHaveBeenCalledWith('target', 'show');
  });

  it('toggles entity filter to hide when actor filter is already active', () => {
    const entityFilterActions = createMockEntityFilterActions({
      isEntityFilterActive: jest.fn().mockImplementation((role) => role === 'actor'),
    });

    const items = getEntityExpandItems({
      nodeId: 'service:my-service',
      entityFilterActions,
      shouldRender: { showActionsByEntity: true },
    });

    const item = items[0] as { onClick: () => void };
    item.onClick();

    expect(entityFilterActions.toggleEntityFilter).toHaveBeenCalledWith('actor', 'hide');
  });

  it('calls toggleRelatedEvents when "Show related events" is clicked', () => {
    const entityFilterActions = createMockEntityFilterActions();

    const items = getEntityExpandItems({
      nodeId: 'user:testuser@default',
      entityFilterActions,
      shouldRender: { showRelatedEvents: true },
    });

    const item = items[0] as { onClick: () => void };
    item.onClick();

    expect(entityFilterActions.toggleRelatedEvents).toHaveBeenCalledWith('show');
  });

  it('toggles related events to hide when already active', () => {
    const entityFilterActions = createMockEntityFilterActions({
      isRelatedEventsActive: jest.fn().mockReturnValue(true),
    });

    const items = getEntityExpandItems({
      nodeId: 'user:test@default',
      entityFilterActions,
      shouldRender: { showRelatedEvents: true },
    });

    const item = items[0] as { onClick: () => void };
    item.onClick();

    expect(entityFilterActions.toggleRelatedEvents).toHaveBeenCalledWith('hide');
  });

  it('calls onClose when filter item is clicked', () => {
    const entityFilterActions = createMockEntityFilterActions();
    const onClose = jest.fn();

    const items = getEntityExpandItems({
      nodeId: 'user:testuser@default',
      entityFilterActions,
      onClose,
      shouldRender: { showActionsByEntity: true },
    });

    const item = items[0] as { onClick: () => void };
    item.onClick();

    expect(onClose).toHaveBeenCalled();
  });

  it('adds separator between filter items and entity details', () => {
    const items = getEntityExpandItems({
      nodeId: 'user:test@default',
      entityFilterActions: createMockEntityFilterActions(),
      shouldRender: { showActionsByEntity: true, showEntityDetails: true },
    });

    // [filter item, separator, entity details]
    expect(items).toHaveLength(3);
    expect(items[1]).toEqual({ type: 'separator' });
  });

  it('does not add separator when only entity details is rendered', () => {
    const items = getEntityExpandItems({
      nodeId: 'user:test@default',
      shouldRender: { showEntityDetails: true },
    });

    // [entity details only — no separator]
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'item' });
  });
});

describe('getEntityFilterSpec', () => {
  const GCP_NAMESPACE_FIELDS = {
    'event.module': 'gcp',
    'data_stream.dataset': 'gcp.audit',
  };

  it('builds DSL with the highest-ranking identity field and the namespace clause', () => {
    const spec = getEntityFilterSpec(
      'user:multi-actor-1@example.com@gcp',
      {
        'user.name': ['Multi Actor 1', 'Multi Actor 2'],
        'user.email': 'multi-actor-1@example.com',
        'user.id': ['multi-actor-1@example.com', 'multi-actor-2@example.com'],
        ...GCP_NAMESPACE_FIELDS,
      },
      euidApi,
      'actor'
    );

    // user.email outranks user.id / user.name, and the namespace clause keeps the filter from
    // matching the same email in the okta / entra_id namespaces (different entities).
    //
    // The `prefix` clause below is the Entity Store's real output, not a stale fixture: it
    // reverses the `firstChunkOfField` namespace source, and this assertion runs against the
    // live builder. Translating it into a filter-bar-compatible operator happens downstream in
    // search_filters; `namespaceSourceValues` carries the raw value needed to do that, and holds
    // only prefix-matched fields — `event.module` is matched exactly and needs no replacement.
    expect(spec).toEqual({
      kind: 'dsl',
      namespaceSourceValues: { 'data_stream.dataset': GCP_NAMESPACE_FIELDS['data_stream.dataset'] },
      dsl: {
        bool: {
          filter: [
            { term: { 'user.email': 'multi-actor-1@example.com' } },
            {
              bool: {
                should: [
                  { term: { 'event.module': 'gcp' } },
                  { prefix: { 'data_stream.dataset': 'gcp' } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    });
  });

  it('takes namespaceSourceValues from the entity store prefix-matched fields, not a hardcoded list', () => {
    // Guards the alignment between this package and the entity definitions: if a namespace
    // source switches to/from `firstChunkOfField`, `prefixMatchFields` changes and the values we
    // carry must follow automatically.
    const { prefixMatchFields, exactMatchFields } = getEuidNamespaceSourceFields('user');
    expect(prefixMatchFields.length).toBeGreaterThan(0);

    const spec = getEntityFilterSpec(
      'user:alice@example.com@gcp',
      { 'user.email': 'alice@example.com', ...GCP_NAMESPACE_FIELDS },
      euidApi,
      'actor'
    );
    const { namespaceSourceValues } = spec as {
      kind: 'dsl';
      namespaceSourceValues: Record<string, string | string[]>;
    };

    // Every carried key is prefix-matched; exact-matched sources are deliberately absent since
    // the DSL already expresses them as term clauses that translate directly to `is` filters.
    expect(Object.keys(namespaceSourceValues)).toEqual(
      Object.keys(GCP_NAMESPACE_FIELDS).filter((field) => prefixMatchFields.includes(field))
    );
    for (const field of exactMatchFields) {
      expect(namespaceSourceValues).not.toHaveProperty(field);
    }
  });

  it('adds exclusion guards when the entity resolved at a lower ranking position', () => {
    const spec = getEntityFilterSpec(
      'user:alice@example.com@gcp',
      { 'user.id': 'alice@example.com', 'user.name': 'Alice', ...GCP_NAMESPACE_FIELDS },
      euidApi,
      'actor'
    );

    // Without the `must_not exists user.email` guard this would also match documents whose
    // user.email resolves them to a different entity.
    expect(spec?.kind).toBe('dsl');
    const dsl = (spec as { kind: 'dsl'; dsl: { bool: { filter: unknown[]; must: unknown[] } } })
      .dsl;
    expect(dsl.bool.filter).toEqual(
      expect.arrayContaining([{ term: { 'user.id': 'alice@example.com' } }])
    );
    expect(JSON.stringify(dsl.bool.must)).toContain('user.email');
    expect(JSON.stringify(dsl.bool.must)).toContain('must_not');
  });

  it('rewrites identity fields to the target namespace for the target role', () => {
    const spec = getEntityFilterSpec(
      'user:multi-actor-1@example.com@gcp',
      { 'user.email': 'multi-actor-1@example.com', ...GCP_NAMESPACE_FIELDS },
      euidApi,
      'target'
    );

    const serialized = JSON.stringify(spec);
    // Identity fields move to `.target.`; namespace source fields describe the event and stay put.
    expect(serialized).toContain('user.target.email');
    expect(serialized).toContain('"event.module"');
    expect(serialized).not.toContain('event.target.module');
    expect(serialized).not.toContain('data_stream.target.dataset');
  });

  it('builds DSL for host, service and generic entities', () => {
    expect(
      getEntityFilterSpec('host:h1', { 'host.id': 'HW-1', 'host.name': 'web-1' }, euidApi, 'actor')
    ).toEqual({
      kind: 'dsl',
      namespaceSourceValues: {},
      dsl: { bool: { filter: [{ term: { 'host.id': 'HW-1' } }] } },
    });

    expect(
      getEntityFilterSpec('service:svc-1', { 'service.name': 'svc-1' }, euidApi, 'actor')
    ).toEqual({
      kind: 'dsl',
      namespaceSourceValues: {},
      dsl: { bool: { filter: [{ term: { 'service.name': 'svc-1' } }] } },
    });

    expect(
      getEntityFilterSpec(
        'projects/p/buckets/b1',
        { 'entity.id': 'projects/p/buckets/b1' },
        euidApi,
        'actor'
      )
    ).toEqual({
      kind: 'dsl',
      namespaceSourceValues: {},
      dsl: { bool: { filter: [{ term: { 'entity.id': 'projects/p/buckets/b1' } }] } },
    });
  });

  it('falls back to identity sourceFields when the euid api has not hydrated', () => {
    const spec = getEntityFilterSpec(
      'user:multi-actor-1@example.com@gcp',
      {
        'user.email': 'multi-actor-1@example.com',
        'user.id': 'multi-actor-1@example.com',
        ...GCP_NAMESPACE_FIELDS,
      },
      undefined,
      'actor'
    );

    // Namespace source fields are excluded: `event.module: gcp` would match every GCP event.
    expect(spec).toEqual({
      kind: 'fields',
      fields: {
        'user.email': 'multi-actor-1@example.com',
        'user.id': 'multi-actor-1@example.com',
      },
    });
  });

  it('falls back to identity sourceFields for an unknown euid prefix', () => {
    const spec = getEntityFilterSpec(
      'wat:something',
      { 'user.email': 'a@b.com' },
      euidApi,
      'actor'
    );

    expect(spec).toEqual({ kind: 'fields', fields: { 'user.email': 'a@b.com' } });
  });

  it('returns undefined when there are no sourceFields', () => {
    expect(getEntityFilterSpec('user:a@b.com@gcp', undefined, euidApi, 'actor')).toBeUndefined();
    expect(getEntityFilterSpec('user:a@b.com@gcp', {}, euidApi, 'actor')).toBeUndefined();
  });

  it('returns undefined when only namespace source fields are present', () => {
    // Nothing identity-bearing to filter on, so emit no filter rather than one matching
    // every event in the dataset.
    expect(
      getEntityFilterSpec('user:a@b.com@gcp', { ...GCP_NAMESPACE_FIELDS }, undefined, 'actor')
    ).toBeUndefined();
  });
});

describe('getRelatedEventsFilter', () => {
  it('uses related.user with user.* values for an enriched user entity', () => {
    const result = getRelatedEventsFilter(
      'user:admin@example.com@gcp',
      { 'user.id': 'admin@example.com', 'user.name': 'Admin' },
      'user'
    );

    expect(result).toEqual({
      field: 'related.user',
      values: ['admin@example.com', 'Admin'],
    });
  });

  it('uses related.hosts with host.* values for an enriched host entity', () => {
    const result = getRelatedEventsFilter(
      'host:h1',
      { 'host.id': 'h1', 'host.name': 'web-1' },
      'host'
    );

    expect(result).toEqual({ field: 'related.hosts', values: ['h1', 'web-1'] });
  });

  it('uses related.entity with service.* values for a service entity', () => {
    const result = getRelatedEventsFilter(
      'service:TargetMultiService1',
      { 'service.name': 'TargetMultiService1' },
      'service'
    );

    expect(result).toEqual({ field: 'related.entity', values: ['TargetMultiService1'] });
  });

  it('uses related.entity with entity.* values for a generic entity', () => {
    const result = getRelatedEventsFilter(
      'projects/p/buckets/b1',
      { 'entity.id': 'projects/p/buckets/b1' },
      'generic'
    );

    expect(result).toEqual({ field: 'related.entity', values: ['projects/p/buckets/b1'] });
  });

  it('derives the type from the euid prefix when engine_type is absent (unenriched entity)', () => {
    // Previously fell through to a generic branch that filtered on the calculated EUID, which
    // appears in no event field and so matched nothing.
    const result = getRelatedEventsFilter('user:admin-user1@example.com@gcp', {
      'user.id': ['admin-user1@example.com', 'admin-user2@example.com'],
    });

    expect(result).toEqual({
      field: 'related.user',
      values: ['admin-user1@example.com', 'admin-user2@example.com'],
    });
  });

  it('never emits the node id (calculated EUID) as a filter value', () => {
    const nodeId = 'service:TargetMultiService1';
    const result = getRelatedEventsFilter(nodeId, { 'service.name': 'TargetMultiService1' });

    expect(result?.values).not.toContain(nodeId);
  });

  it('returns undefined when no values are available rather than an unmatchable filter', () => {
    expect(getRelatedEventsFilter('user:a@b.com@gcp', {})).toBeUndefined();
    expect(getRelatedEventsFilter('user:a@b.com@gcp', undefined)).toBeUndefined();
    // Only fields of other prefixes present.
    expect(getRelatedEventsFilter('host:h1', { 'user.id': 'a@b.com' }, 'host')).toBeUndefined();
  });

  it('ignores empty-string values', () => {
    expect(
      getRelatedEventsFilter('user:a@b.com@gcp', { 'user.id': ['', 'a@b.com'] }, 'user')
    ).toEqual({ field: 'related.user', values: ['a@b.com'] });
  });
});
