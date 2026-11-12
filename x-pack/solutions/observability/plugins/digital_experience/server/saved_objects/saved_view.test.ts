/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAVED_VIEW_TYPE } from '../../common/saved_views';
import { savedViewSavedObjectType } from './saved_view';

interface Schema {
  validate: (value: unknown) => unknown;
}

interface ModelVersion {
  changes: unknown[];
  schemas: { create: Schema; forwardCompatibility: Schema };
}

// The type gives its model versions as a map, never as a provider function.
const modelVersions = savedViewSavedObjectType.modelVersions as unknown as Record<
  number,
  ModelVersion
>;

const createSchema = (): Schema => modelVersions[1].schemas.create;

const forwardSchema = (): Schema => modelVersions[1].schemas.forwardCompatibility;

describe('the saved view saved object type', () => {
  it('is registered under its name, in the space it is saved in', () => {
    expect(savedViewSavedObjectType).toMatchObject({
      name: SAVED_VIEW_TYPE,
      namespaceType: 'single',
      hidden: false,
    });
  });

  it('maps nothing: a space’s views are read whole, not searched', () => {
    expect(savedViewSavedObjectType.mappings).toEqual({ dynamic: false, properties: {} });
  });

  it('is titled by its name, and can be exported and imported', () => {
    const { management } = savedViewSavedObjectType;

    expect(management?.importableAndExportable).toBe(true);
    expect(
      management?.getTitle?.({
        attributes: { name: 'Safari on iOS' },
        id: 'a',
        type: SAVED_VIEW_TYPE,
        references: [],
      })
    ).toBe('Safari on iOS');
  });

  it('starts at model version 1, with nothing to change', () => {
    expect(Object.keys(modelVersions)).toEqual(['1']);
    expect(modelVersions[1].changes).toEqual([]);
  });

  it('accepts what a view keeps, up to what the routes take', () => {
    expect(() =>
      createSchema().validate({
        name: 'checkout in Germany',
        description: 'The page loads of /checkout from Germany',
        filters: '!((meta:(key:country,params:(query:DE),type:phrase)))',
        kuery: 'user_agent.name : "Chrome"',
        percentile: '95',
        rangeFrom: 'now-7d',
        rangeTo: 'now',
      })
    ).not.toThrow();
    expect(() => createSchema().validate({ name: 'a' })).not.toThrow();
  });

  it.each([
    ['no name', {}],
    ['an empty name', { name: '' }],
    ['a name too long', { name: 'x'.repeat(257) }],
    ['a description too long', { name: 'a', description: 'x'.repeat(1025) }],
    ['filters too long', { name: 'a', filters: 'x'.repeat(8193) }],
    ['a query too long', { name: 'a', kuery: 'x'.repeat(2049) }],
    ['a percentile that is not offered', { name: 'a', percentile: '42' }],
    ['a time range too long', { name: 'a', rangeFrom: 'x'.repeat(129) }],
  ])('rejects %s', (_, attributes) => {
    expect(() => createSchema().validate(attributes)).toThrow();
  });

  it('ignores what a newer version added, rather than failing on it', () => {
    expect(() => forwardSchema().validate({ name: 'a', somethingNew: 1 })).not.toThrow();
  });
});
