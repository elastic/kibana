/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_GROUP, ALERT_GROUP_FIELD, ALERT_GROUP_VALUE } from '@kbn/rule-data-utils';
import { getGroupQueries, getGroupFilters, getGroups, getGroupsFromAlertFields } from './get_group';

describe('getGroup', () => {
  describe('getGroupQueries', () => {
    it('should generate correct query with default field name', () => {
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];

      expect(getGroupQueries(groups)).toEqual([
        { match_phrase: { 'container.id': 'container-0' } },
        { match_phrase: { 'host.name': 'host-0' } },
      ]);
    });

    it('should generate correct query with custom field name', () => {
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];
      const fieldName = 'custom.field';

      expect(getGroupQueries(groups, fieldName)).toEqual([
        { match_phrase: { 'custom.field': 'container-0' } },
        { match_phrase: { 'custom.field': 'host-0' } },
      ]);
    });

    it('should return empty array when groups is empty', () => {
      const groups = undefined;

      expect(getGroupQueries(groups)).toEqual([]);
    });
  });

  describe('getGroupFilters', () => {
    it('should generate correct filter with default field name', () => {
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];

      expect(getGroupFilters(groups)).toEqual([
        {
          meta: {},
          query: { match_phrase: { 'container.id': 'container-0' } },
        },
        {
          meta: {},
          query: { match_phrase: { 'host.name': 'host-0' } },
        },
      ]);
    });

    it('should generate correct filter with custom field name', () => {
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];
      const fieldName = 'custom.field';

      expect(getGroupFilters(groups, fieldName)).toEqual([
        {
          meta: {},
          query: { match_phrase: { 'custom.field': 'container-0' } },
        },
        {
          meta: {},
          query: { match_phrase: { 'custom.field': 'host-0' } },
        },
      ]);
    });

    it('should return empty array when groups is empty', () => {
      const groups = undefined;

      expect(getGroupFilters(groups)).toEqual([]);
    });
  });

  describe('getGroups', () => {
    it('should generate correct filter with default field name', () => {
      const fields = ['container.id', 'host.name'];
      const values = ['container-0', 'host-0'];
      const groups = [
        { field: 'container.id', value: 'container-0' },
        { field: 'host.name', value: 'host-0' },
      ];

      expect(getGroups(fields, values)).toEqual(groups);
    });

    it('should return empty array if fields and values are empty', () => {
      expect(getGroups([], [])).toEqual([]);
    });

    it('should return empty array if fields and values are undefined', () => {
      expect(getGroups()).toEqual([]);
    });
  });

  describe('getGroupsFromAlertFields', () => {
    it('reads nested alert groups and converts a finite numeric value', () => {
      expect(
        getGroupsFromAlertFields({
          [ALERT_GROUP]: [
            { field: 'service.name', value: 'checkout' },
            { field: 'host.name', value: 1 },
            { field: 'container.id', value: '' },
            { field: '', value: 'web-1' },
            { field: 'host.name', value: true },
            { field: 2, value: 'web-1' },
          ],
        })
      ).toEqual([
        { field: 'service.name', value: 'checkout' },
        { field: 'host.name', value: '1' },
      ]);
    });

    it('zips flattened alert group fields and values', () => {
      expect(
        getGroupsFromAlertFields({
          [ALERT_GROUP_FIELD]: ['service.name', 'host.name'],
          [ALERT_GROUP_VALUE]: ['checkout', 'web-1'],
        })
      ).toEqual([
        { field: 'service.name', value: 'checkout' },
        { field: 'host.name', value: 'web-1' },
      ]);
    });

    it('returns no groups when flattened fields and values have different lengths', () => {
      expect(
        getGroupsFromAlertFields({
          [ALERT_GROUP_FIELD]: ['service.name', 'host.name'],
          [ALERT_GROUP_VALUE]: ['checkout'],
        })
      ).toEqual([]);
    });

    it('rejects an empty string or boolean group value', () => {
      expect(
        getGroupsFromAlertFields({
          [ALERT_GROUP_FIELD]: ['service.name'],
          [ALERT_GROUP_VALUE]: [''],
        })
      ).toEqual([]);
      expect(
        getGroupsFromAlertFields({
          [ALERT_GROUP_FIELD]: ['service.name'],
          [ALERT_GROUP_VALUE]: [true],
        })
      ).toEqual([]);
    });
  });
});
