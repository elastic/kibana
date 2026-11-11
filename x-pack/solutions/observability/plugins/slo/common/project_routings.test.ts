/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_PROJECT_ROUTING,
  LOCAL_PROJECT_ROUTING,
  toEsProjectRouting,
  toPickerProjectRouting,
} from './project_routings';

const SUBSET_ROUTING = '_id:p1 AND _id:p2';

describe('toEsProjectRouting', () => {
  it('maps null to LOCAL', () => {
    expect(toEsProjectRouting(null, undefined)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('maps LOCAL to LOCAL', () => {
    expect(toEsProjectRouting(LOCAL_PROJECT_ROUTING, undefined)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('maps ALL to ALL', () => {
    expect(toEsProjectRouting(ALL_PROJECT_ROUTING, undefined)).toBe(ALL_PROJECT_ROUTING);
  });

  it('maps undefined + true to LOCAL', () => {
    expect(toEsProjectRouting(undefined, true)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('maps undefined + false to ALL', () => {
    expect(toEsProjectRouting(undefined, false)).toBe(ALL_PROJECT_ROUTING);
  });

  it('maps both unset to ALL', () => {
    expect(toEsProjectRouting(undefined, undefined)).toBe(ALL_PROJECT_ROUTING);
  });

  it('passes through subset expressions', () => {
    expect(toEsProjectRouting(SUBSET_ROUTING, undefined)).toBe(SUBSET_ROUTING);
  });

  it('treats null as equivalent to LOCAL', () => {
    expect(toEsProjectRouting(null, false)).toBe(toEsProjectRouting(LOCAL_PROJECT_ROUTING, false));
    expect(toEsProjectRouting(null, true)).toBe(toEsProjectRouting(LOCAL_PROJECT_ROUTING, true));
  });

  it('lets defined projectRoutings override preventCrossProjectSearch', () => {
    expect(toEsProjectRouting(ALL_PROJECT_ROUTING, true)).toBe(ALL_PROJECT_ROUTING);
    expect(toEsProjectRouting(LOCAL_PROJECT_ROUTING, false)).toBe(LOCAL_PROJECT_ROUTING);
    expect(toEsProjectRouting(SUBSET_ROUTING, false)).toBe(SUBSET_ROUTING);
  });

  it('treats empty string as LOCAL (fail-safe)', () => {
    expect(toEsProjectRouting('', undefined)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('treats whitespace-only string as LOCAL (fail-safe)', () => {
    expect(toEsProjectRouting('   ', undefined)).toBe(LOCAL_PROJECT_ROUTING);
  });
});

describe('toPickerProjectRouting', () => {
  it('maps null to LOCAL', () => {
    expect(toPickerProjectRouting(null, undefined)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('maps LOCAL to LOCAL', () => {
    expect(toPickerProjectRouting(LOCAL_PROJECT_ROUTING, undefined)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('maps ALL to ALL', () => {
    expect(toPickerProjectRouting(ALL_PROJECT_ROUTING, undefined)).toBe(ALL_PROJECT_ROUTING);
  });

  it('maps undefined + true to LOCAL', () => {
    expect(toPickerProjectRouting(undefined, true)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('maps undefined + false to ALL', () => {
    expect(toPickerProjectRouting(undefined, false)).toBe(ALL_PROJECT_ROUTING);
  });

  it('maps both unset to undefined (case 0 — wrapper seeds LOCAL)', () => {
    expect(toPickerProjectRouting(undefined, undefined)).toBeUndefined();
  });

  it('passes through subset expressions', () => {
    expect(toPickerProjectRouting(SUBSET_ROUTING, undefined)).toBe(SUBSET_ROUTING);
  });

  it('treats null as equivalent to LOCAL', () => {
    expect(toPickerProjectRouting(null, false)).toBe(
      toPickerProjectRouting(LOCAL_PROJECT_ROUTING, false)
    );
    expect(toPickerProjectRouting(null, true)).toBe(
      toPickerProjectRouting(LOCAL_PROJECT_ROUTING, true)
    );
  });

  it('lets defined projectRoutings override preventCrossProjectSearch', () => {
    expect(toPickerProjectRouting(ALL_PROJECT_ROUTING, true)).toBe(ALL_PROJECT_ROUTING);
    expect(toPickerProjectRouting(LOCAL_PROJECT_ROUTING, false)).toBe(LOCAL_PROJECT_ROUTING);
    expect(toPickerProjectRouting(SUBSET_ROUTING, false)).toBe(SUBSET_ROUTING);
  });

  it('treats empty string as LOCAL (fail-safe)', () => {
    expect(toPickerProjectRouting('', undefined)).toBe(LOCAL_PROJECT_ROUTING);
  });

  it('treats whitespace-only string as LOCAL (fail-safe)', () => {
    expect(toPickerProjectRouting('   ', undefined)).toBe(LOCAL_PROJECT_ROUTING);
  });
});
