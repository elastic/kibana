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
    expect(preferredSchemaForInventoryView('host', staticInventoryViewId, undefined, false)).toBe(
      null
    );
  });

  it('keeps an explicit schema on the static host view', () => {
    expect(preferredSchemaForInventoryView('host', staticInventoryViewId, 'ecs', false)).toBe(
      'ecs'
    );
  });

  it('nulls an omitted schema on the static pod view when the selector flag is on', () => {
    expect(preferredSchemaForInventoryView('pod', staticInventoryViewId, undefined, true)).toBe(
      null
    );
  });

  it('leaves an omitted schema undefined on the static pod view when the selector flag is off', () => {
    expect(
      preferredSchemaForInventoryView('pod', staticInventoryViewId, undefined, false)
    ).toBeUndefined();
  });

  it('preserves a custom pod view schema whether or not the flag is on', () => {
    expect(preferredSchemaForInventoryView('pod', 'saved-1', 'ecs', true)).toBe('ecs');
    expect(preferredSchemaForInventoryView('pod', 'saved-1', 'semconv', false)).toBe('semconv');
  });

  it('does not null the schema for node types without a selector', () => {
    expect(
      preferredSchemaForInventoryView('container', staticInventoryViewId, undefined, true)
    ).toBeUndefined();
  });
});
