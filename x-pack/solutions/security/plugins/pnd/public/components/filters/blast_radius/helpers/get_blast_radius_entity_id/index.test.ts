/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBlastRadiusEntityId } from '.';

describe('getBlastRadiusEntityId', () => {
  it('joins the field and the value', () => {
    expect(getBlastRadiusEntityId({ field: 'host.name', value: 'web-1' })).toEqual(
      'host.name:web-1'
    );
  });

  /**
   * The same term on two different fields is two different entities, and a chip for each. An id that
   * collapsed them would filter the queue by the wrong thing.
   */
  it('gives the same value on two fields two different ids', () => {
    expect(getBlastRadiusEntityId({ field: 'host.name', value: 'web-1' })).not.toEqual(
      getBlastRadiusEntityId({ field: 'user.name', value: 'web-1' })
    );
  });

  /** An ECS field name never contains a colon, so an IPv6 value cannot collide with another pair. */
  it('keeps a value containing colons unambiguous', () => {
    expect(getBlastRadiusEntityId({ field: 'source.ip', value: 'fe80::1' })).toEqual(
      'source.ip:fe80::1'
    );
  });
});
