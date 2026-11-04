/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entitySchema } from '@kbn/entity-store/common';
import { INVENTORY_DEFINITION_FIXTURES, k8sNodeFixture } from './__fixtures__/definitions';

describe('inventory definition fixtures', () => {
  const cases = INVENTORY_DEFINITION_FIXTURES.map(
    (definition) => [definition.type, definition] as const
  );

  it.each(cases)('%s parses against the store definition schema', (type, definition) => {
    const result = entitySchema.safeParse({ ...definition, id: `${type}-default` });
    expect(result.error?.issues).toBeUndefined();
    expect(result.data?.dynamic).toEqual(definition.dynamic);
  });

  it.each(cases)('%s carries no extraction block', (_type, definition) => {
    expect(definition.extraction).toBeUndefined();
  });

  it('the schema applies the dynamic definition rules to a fixture that breaks them', () => {
    const result = entitySchema.safeParse({
      ...k8sNodeFixture,
      id: `${k8sNodeFixture.type}-default`,
      identityField: { ...k8sNodeFixture.identityField, skipTypePrepend: true },
    });
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      'servable identity: entity ids keep the type prefix; remove skipTypePrepend',
    ]);
  });
});
