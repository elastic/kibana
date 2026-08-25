/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line no-restricted-imports
import { legacyGetFilter } from './legacy_find_notifications';
import { LEGACY_NOTIFICATIONS_ID } from '../../../../../../common/constants';

describe('legacyFind_notifications', () => {
  test('it returns a full filter with an AND if sent down', () => {
    expect(legacyGetFilter('alert.attributes.enabled: true')).toEqual(
      `alert.attributes.alertTypeId: ${LEGACY_NOTIFICATIONS_ID} AND alert.attributes.enabled: true`
    );
  });

  test('it returns existing filter with no AND when not set', () => {
    expect(legacyGetFilter(null)).toEqual(
      `alert.attributes.alertTypeId: ${LEGACY_NOTIFICATIONS_ID}`
    );
  });
});
