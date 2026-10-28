/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveInfraPageHasData } from './resolve_infra_page_has_data';

describe('resolveInfraPageHasData', () => {
  it('uses the page override when the template does not fetch hasData', () => {
    expect(resolveInfraPageHasData(false, true)).toBe(true);
    expect(resolveInfraPageHasData(false, false)).toBe(false);
  });

  it('falls back to the fetched value when no override is passed', () => {
    expect(resolveInfraPageHasData(true)).toBe(true);
    expect(resolveInfraPageHasData(false)).toBe(false);
  });
});
