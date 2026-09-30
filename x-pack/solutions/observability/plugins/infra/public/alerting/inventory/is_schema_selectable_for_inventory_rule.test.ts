/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSchemaSelectableForInventoryRule } from './is_schema_selectable_for_inventory_rule';

describe('isSchemaSelectableForInventoryRule', () => {
  it('offers the control for hosts', () => {
    expect(isSchemaSelectableForInventoryRule('host')).toBe(true);
  });

  it('offers the control for pods', () => {
    expect(isSchemaSelectableForInventoryRule('pod')).toBe(true);
  });

  it('never offers the control for node types that have no schema', () => {
    expect(isSchemaSelectableForInventoryRule('container')).toBe(false);
    expect(isSchemaSelectableForInventoryRule('awsEC2')).toBe(false);
  });

  it('handles a node type that has not been chosen yet', () => {
    expect(isSchemaSelectableForInventoryRule(undefined)).toBe(false);
  });
});
