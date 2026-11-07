/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryRequestError, InventoryTypeDefinitionError, InventoryTypeNotFoundError } from '.';

describe('inventory errors', () => {
  it('InventoryTypeNotFoundError names the type and carries 404', () => {
    const error = new InventoryTypeNotFoundError('k8s.pod');
    expect(error).toMatchObject({
      name: 'InventoryTypeNotFoundError',
      statusCode: 404,
      message: 'Entity type "k8s.pod" is not available in the entity inventory',
    });
  });

  it('InventoryTypeNotFoundError appends the reason when given one', () => {
    expect(
      new InventoryTypeNotFoundError('k8s.pod', 'its entity definition has no dynamic block')
        .message
    ).toBe(
      'Entity type "k8s.pod" is not available in the entity inventory: its entity definition has no dynamic block'
    );
  });

  it('InventoryRequestError keeps the message and carries 400', () => {
    const error = new InventoryRequestError('limit must be at most 1000');
    expect(error).toMatchObject({
      name: 'InventoryRequestError',
      statusCode: 400,
      message: 'limit must be at most 1000',
    });
  });

  it('InventoryTypeDefinitionError names the type and the failed rule, and carries 400', () => {
    const error = new InventoryTypeDefinitionError('k8s.pod', 'identity has no fields');
    expect(error).toMatchObject({
      name: 'InventoryTypeDefinitionError',
      statusCode: 400,
      message: 'Entity type "k8s.pod" cannot be queried: identity has no fields',
    });
  });
});
