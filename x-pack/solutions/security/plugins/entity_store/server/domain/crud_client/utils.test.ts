/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../common/domain/definitions/entity.gen';
import {
  type EntityField,
  type EntityType,
  type ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { BadCRUDRequestError } from '../errors';
import { hashEuid, validateAndTransformDocForUpsert } from './utils';

jest.mock('../../../common/domain/definitions/registry');

const mockGetEntityDefinition = getEntityDefinition as jest.MockedFunction<
  typeof getEntityDefinition
>;

const createField = (source: string, allowAPIUpdate = true): EntityField => ({
  allowAPIUpdate,
  source,
  destination: source,
  mapping: { type: 'keyword' },
  retention: { operation: 'prefer_newest_value' },
});

const createDefinition = (
  type: EntityType,
  fields: EntityField[],
  requiresOneOfFields: string[] = []
): ManagedEntityDefinition => ({
  id: `security_${type}_default`,
  name: `${type} definition`,
  type,
  fields,
  identityField: {
    requiresOneOfFields,
    euidFields: [[{ field: 'entity.id' }]],
  },
  indexPatterns: ['logs-*'],
});

describe('crud_client utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hashEuid: returns a valid MD5 hash', () => {
    const hashedId = hashEuid('entity-id');

    expect(hashedId).toMatch(/^[a-f0-9]{32}$/);
    expect(hashedId).toBe('169fbe0cb705d8d8811b5098d0cf4588');
  });

  it('validateAndTransformDocForUpsert: returns generic document with timestamp', () => {
    mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

    const doc: Entity = {
      entity: { id: 'entity-generic' },
    };
    const result = validateAndTransformDocForUpsert('generic', 'default', doc, true);

    expect(result).toEqual(
      expect.objectContaining({
        '@timestamp': expect.any(String),
        entity: { id: 'entity-generic' },
      })
    );
  });

  it('transformDocForUpsert: nests entity under typed field and preserves name', () => {
    mockGetEntityDefinition.mockReturnValue(createDefinition('host', [createField('host.name')]));

    const doc: Entity = {
      entity: { id: 'entity-host' },
      host: { name: 'original-host-name' },
    };
    const result = validateAndTransformDocForUpsert('host', 'default', doc, false);

    expect(result).toEqual(expect.objectContaining({ '@timestamp': expect.any(String) }));
    expect(result).not.toHaveProperty('entity');
    expect(result).toHaveProperty('host.entity.id', 'entity-host');
    expect(result).toHaveProperty('host.name', 'original-host-name');
  });

  it('getFieldDescriptions: ignores identity source fields from validation', () => {
    mockGetEntityDefinition.mockReturnValue(createDefinition('host', [], ['host.name']));

    const doc: Entity = {
      entity: { id: 'entity-host-identity' },
      host: { name: 'identity-host' },
    };

    expect(() => validateAndTransformDocForUpsert('host', 'default', doc, false)).not.toThrow();
  });

  it('assertOnlyNonForcedAttributesInReq: allows updates for allowAPIUpdate fields', () => {
    mockGetEntityDefinition.mockReturnValue(
      createDefinition('generic', [createField('entity.attributes.privileged', true)])
    );

    const doc: Entity = {
      entity: {
        id: 'entity-allow-update',
        attributes: {
          privileged: true,
        },
      },
    };
    const result = validateAndTransformDocForUpsert('generic', 'default', doc, false);

    expect(result).toHaveProperty('entity.attributes.privileged', true);
  });

  it('getFieldDescriptions: throws for fields missing from definition', () => {
    mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

    const doc: Entity = {
      entity: {
        id: 'entity-invalid-field',
        attributes: {
          managed: true,
        },
      },
    };

    expect(() => validateAndTransformDocForUpsert('generic', 'default', doc, false)).toThrow(
      new BadCRUDRequestError(
        'The following attributes are not allowed to be updated: [entity.attributes.managed]'
      )
    );
  });

  it('assertOnlyNonForcedAttributesInReq: throws when non-force request updates restricted fields', () => {
    mockGetEntityDefinition.mockReturnValue(
      createDefinition('generic', [createField('entity.attributes.managed', false)])
    );

    const doc: Entity = {
      entity: {
        id: 'entity-restricted-update',
        attributes: {
          managed: true,
        },
      },
    };

    expect(() => validateAndTransformDocForUpsert('generic', 'default', doc, false)).toThrow(
      new BadCRUDRequestError(
        'The following attributes are not allowed to be updated without forcing it (?force=true): entity.attributes.managed'
      )
    );
  });

  it('validateAndTransformDocForUpsert: bypasses validation when force=true', () => {
    mockGetEntityDefinition.mockReturnValue(
      createDefinition('generic', [createField('entity.attributes.managed', false)])
    );

    const doc: Entity = {
      entity: {
        id: 'entity-force-update',
        attributes: {
          managed: true,
        },
      },
    };

    expect(() => validateAndTransformDocForUpsert('generic', 'default', doc, true)).not.toThrow();
  });
});
