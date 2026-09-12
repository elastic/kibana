/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';

import { assertAlertsIndexPatternInSpace } from '.';

describe('assertAlertsIndexPatternInSpace', () => {
  it('accepts the caller-space index in the default space', () => {
    expect(() =>
      assertAlertsIndexPatternInSpace({
        alertsIndexPattern: '.alerts-security.alerts-default',
        spaceId: 'default',
      })
    ).not.toThrow();
  });

  it('accepts the caller-space index in a non-default space', () => {
    expect(() =>
      assertAlertsIndexPatternInSpace({
        alertsIndexPattern: '.alerts-security.alerts-test-space',
        spaceId: 'test-space',
      })
    ).not.toThrow();
  });

  it('rejects another space index with a BadRequestError', () => {
    expect(() =>
      assertAlertsIndexPatternInSpace({
        alertsIndexPattern: '.alerts-security.alerts-other-space',
        spaceId: 'default',
      })
    ).toThrow(BadRequestError);
  });

  it('rejects the cross-space wildcard', () => {
    expect(() =>
      assertAlertsIndexPatternInSpace({
        alertsIndexPattern: '.alerts-security.alerts-*',
        spaceId: 'default',
      })
    ).toThrow(BadRequestError);
  });

  it('rejects a caller-space index when the space id does not match', () => {
    expect(() =>
      assertAlertsIndexPatternInSpace({
        alertsIndexPattern: '.alerts-security.alerts-default',
        spaceId: 'test-space',
      })
    ).toThrow(BadRequestError);
  });
});
