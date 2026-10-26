/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { staticInventoryViewId } from '../inventory_views/defaults';
import { preferredSchemaForInventoryView } from './preferred_schema_for_inventory_view';

describe('preferredSchemaForInventoryView', () => {
  it('nulls an omitted schema on the static host view so detection can hydrate it', () => {
    expect(preferredSchemaForInventoryView('host', staticInventoryViewId, undefined)).toBe(null);
  });

  it('keeps an explicit schema on the static host view', () => {
    expect(preferredSchemaForInventoryView('host', staticInventoryViewId, 'ecs')).toBe('ecs');
  });

  it('nulls an omitted schema on the static pod view so detection can hydrate it', () => {
    expect(preferredSchemaForInventoryView('pod', staticInventoryViewId, undefined)).toBe(null);
  });

  it('preserves a custom pod view schema', () => {
    expect(preferredSchemaForInventoryView('pod', 'saved-1', 'ecs')).toBe('ecs');
    expect(preferredSchemaForInventoryView('pod', 'saved-1', 'semconv')).toBe('semconv');
  });

  it('does not null the schema for node types without a selector', () => {
    expect(
      preferredSchemaForInventoryView('container', staticInventoryViewId, undefined)
    ).toBeUndefined();
  });
});
