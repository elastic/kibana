/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotEmptyCondition } from '../../../common/domain/definitions/common_fields';
import {
  type EntityField,
  type EntityType,
  type ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { BadCRUDRequestError } from '../errors';
import {
  hashEuid,
  validateAndTransformDocForUpsert,
  validateUpdateDocIdentification,
} from './utils';

jest.mock('../../../common/domain/definitions/registry', () => ({
  ...jest.requireActual('../../../common/domain/definitions/registry'),
  getEntityDefinition: jest.fn(),
}));

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

const createDefinition = (type: EntityType, fields: EntityField[]): ManagedEntityDefinition => ({
  id: `security_${type}_default`,
  name: `${type} definition`,
  type,
  fields,
  identityField: {
    euidFields: [[{ field: 'entity.id' }]],
    documentsFilter: isNotEmptyCondition('entity.id'),
  },
  indexPatterns: ['logs-*'],
});

describe('crud_client utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashEuid', () => {
    it('returns a valid MD5 hash', () => {
      const hashedId = hashEuid('entity-id');

      expect(hashedId).toMatch(/^[a-f0-9]{32}$/);
      expect(hashedId).toBe('169fbe0cb705d8d8811b5098d0cf4588');
    });
  });

  describe('validateUpdateDocIdentification', () => {
    it('passes when doc has entity.id and no generatedId', () => {
      const doc = { 'entity.id': 'my-id' };
      expect(() => validateUpdateDocIdentification(doc, undefined)).not.toThrow();
    });

    it('passes when doc has no entity.id but generatedId is provided', () => {
      const doc = { 'host.name': 'some-host' };
      expect(() => validateUpdateDocIdentification(doc, 'generated-id')).not.toThrow();
    });

    it('passes when doc entity.id matches generatedId', () => {
      const doc = { 'entity.id': 'same-id' };
      expect(() => validateUpdateDocIdentification(doc, 'same-id')).not.toThrow();
    });

    it('throws when doc has no entity.id and generatedId is undefined', () => {
      const doc = { 'host.name': 'some-host' };
      expect(() => validateUpdateDocIdentification(doc, undefined)).toThrow(
        new BadCRUDRequestError('Could not derive EUID from document or find it in entity.id')
      );
    });

    it('throws when doc entity.id does not match generatedId', () => {
      const doc = { 'entity.id': 'supplied-id' };
      expect(() => validateUpdateDocIdentification(doc, 'different-id')).toThrow(
        new BadCRUDRequestError(
          'Supplied ID supplied-id does not match generated EUID different-id'
        )
      );
    });
  });

  describe('validateAndTransformDocForUpsert', () => {
    it('returns ValidatedDoc with id and transformed doc', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc = { 'entity.id': 'entity-generic' };
      const result = validateAndTransformDocForUpsert(
        'generic',
        'default',
        doc,
        undefined,
        true
      );

      expect(result.id).toBe('entity-generic');
      expect(result.doc).toEqual(
        expect.objectContaining({
          '@timestamp': expect.any(String),
          'entity.id': 'entity-generic',
        })
      );
    });

    it('uses generatedId when doc has no entity.id', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc = { 'host.name': 'some-host' };
      const result = validateAndTransformDocForUpsert(
        'generic',
        'default',
        doc,
        'generated-id',
        true
      );

      expect(result.id).toBe('generated-id');
      expect(doc['entity.id']).toBe('generated-id');
    });

    it('uses doc entity.id when generatedId is undefined', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc = { 'entity.id': 'doc-id' };
      const result = validateAndTransformDocForUpsert(
        'generic',
        'default',
        doc,
        undefined,
        true
      );

      expect(result.id).toBe('doc-id');
    });

    it('ignores identity source fields from validation', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('host', []));

      const doc = { 'entity.id': 'entity-host-identity', 'host.name': 'identity-host' };

      expect(() =>
        validateAndTransformDocForUpsert('host', 'default', doc, undefined, false)
      ).not.toThrow();
    });

    it('allows updates for allowAPIUpdate fields', () => {
      mockGetEntityDefinition.mockReturnValue(
        createDefinition('generic', [createField('entity.attributes.watchlists', true)])
      );

      const doc = {
        'entity.id': 'entity-allow-update',
        'entity.attributes.watchlists': ['privileged_watchlist_id'],
      };
      const result = validateAndTransformDocForUpsert(
        'generic',
        'default',
        doc,
        undefined,
        false
      );

      expect(result.doc['entity.attributes.watchlists']).toEqual(['privileged_watchlist_id']);
    });

    it('throws for fields missing from definition', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc = {
        'entity.id': 'entity-invalid-field',
        'entity.attributes.managed': true,
      };

      expect(() =>
        validateAndTransformDocForUpsert('generic', 'default', doc, undefined, false)
      ).toThrow(
        new BadCRUDRequestError(
          'The following attributes are not allowed to be updated: [entity.attributes.managed]'
        )
      );
    });

    it('throws when non-force request updates restricted fields', () => {
      mockGetEntityDefinition.mockReturnValue(
        createDefinition('generic', [createField('entity.attributes.managed', false)])
      );

      const doc = {
        'entity.id': 'entity-restricted-update',
        'entity.attributes.managed': true,
      };

      expect(() =>
        validateAndTransformDocForUpsert('generic', 'default', doc, undefined, false)
      ).toThrow(
        new BadCRUDRequestError(
          'The following attributes are not allowed to be updated without forcing it (?force=true): entity.attributes.managed'
        )
      );
    });

    it('bypasses validation when force=true', () => {
      mockGetEntityDefinition.mockReturnValue(
        createDefinition('generic', [createField('entity.attributes.managed', false)])
      );

      const doc = {
        'entity.id': 'entity-force-update',
        'entity.attributes.managed': true,
      };

      expect(() =>
        validateAndTransformDocForUpsert('generic', 'default', doc, undefined, true)
      ).not.toThrow();
    });
  });
});
