/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSourceFieldsFromNode,
  getEntityTypeFromNodeId,
  getEntityExpandItems,
  fieldForRole,
} from './get_entity_expand_items';
import type { EntityFilterActions } from './get_entity_expand_items';
import type { NodeViewModel } from '../../types';

describe('getSourceFieldsFromNode', () => {
  it('returns sourceFields from the first document entity', () => {
    const node = {
      documentsData: [
        {
          id: 'doc1',
          type: 'entity',
          entity: {
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
