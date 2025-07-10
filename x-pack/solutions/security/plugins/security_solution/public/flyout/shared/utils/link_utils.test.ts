/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TableId } from '@kbn/securitysolution-data-table';
import { isFlyoutLink } from './link_utils';

describe('isFlyoutLink', () => {
  it('should return true if field is host.name', () => {
    expect(isFlyoutLink({ field: 'host.name', scopeId: 'scopeId' })).toBe(true);
  });

  it('should return true if field is user.name', () => {
    expect(isFlyoutLink({ field: 'user.name', scopeId: 'scopeId' })).toBe(true);
  });

  it('should return true if field is rule.name and ruleId is provided', () => {
    expect(
      isFlyoutLink({ field: 'kibana.alert.rule.name', ruleId: 'ruleId', scopeId: 'scopeId' })
    ).toBe(true);
  });

  it('shoud return false if field is rule name and rule id is not provided', () => {
    expect(
      isFlyoutLink({ field: 'kibana.alert.rule.name', ruleId: undefined, scopeId: 'scopeId' })
    ).toBe(false);
  });

  it('shoud return false if field is rule name, rule id is provided and scopeId is rule preview', () => {
    expect(
      isFlyoutLink({
        field: 'kibana.alert.rule.name',
        ruleId: 'ruleId',
        scopeId: TableId.rulePreview,
      })
    ).toBe(false);
  });

  it('should return true if field type is source.ip', () => {
    expect(isFlyoutLink({ field: 'source.ip', scopeId: 'scopeId' })).toBe(true);
    expect(isFlyoutLink({ field: 'destination.ip', scopeId: 'scopeId' })).toBe(true);
    expect(isFlyoutLink({ field: 'host.ip', scopeId: 'scopeId' })).toBe(true);
  });

  it('should return false if field is not host.name, user.name, rule name or ip type', () => {
    expect(isFlyoutLink({ field: 'field', scopeId: 'scopeId' })).toBe(false); // non-ecs field
    expect(isFlyoutLink({ field: 'event.category', scopeId: 'scopeId' })).toBe(false); // ecs field but not ip type
  });
});
