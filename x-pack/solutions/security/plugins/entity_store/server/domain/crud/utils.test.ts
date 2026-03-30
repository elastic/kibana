/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotEmptyCondition } from '../../../common/domain/definitions/common_fields';
import type { Entity } from '../../../common/domain/definitions/entity.gen';
import {
  type EntityField,
  type EntityType,
  type ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { BadCRUDRequestError } from '../errors';
import { hashEuid, validateAndTransformDoc, validateDocIdentification } from './utils';

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
    euidRanking: {
      branches: [{ ranking: [[{ field: 'entity.id' }]] }],
    },
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

  describe('validateDocIdentification', () => {
    it('returns doc entity.id when no generatedId', () => {
      const doc: Entity = { entity: { id: 'my-id' } };
      expect(validateDocIdentification(doc, undefined)).toBe('my-id');
    });

    it('returns generatedId when doc has no entity.id', () => {
      const doc = { host: { name: 'some-host' } } as Entity;
      expect(validateDocIdentification(doc, 'generated-id')).toBe('generated-id');
    });

    it('returns generatedId when doc entity.id matches generatedId', () => {
      const doc: Entity = { entity: { id: 'same-id' } };
      expect(validateDocIdentification(doc, 'same-id')).toBe('same-id');
    });

    it('prefers generatedId over doc entity.id when both present', () => {
      const doc: Entity = { entity: { id: 'supplied-id' } };
      expect(() => validateDocIdentification(doc, 'different-id')).toThrow(
        new BadCRUDRequestError(
          'Supplied ID supplied-id does not match generated EUID different-id'
        )
      );
    });

    it('throws when doc has no entity.id and generatedId is undefined', () => {
      const doc = { host: { name: 'some-host' } } as Entity;
      expect(() => validateDocIdentification(doc, undefined)).toThrow(
        new BadCRUDRequestError('Could not derive EUID from document or find it in entity.id')
      );
    });
  });

  describe('validateAndTransformDoc', () => {
    it('returns ValidatedDoc with id and transformed doc', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc: Entity = { entity: { id: 'entity-generic' } };
      const result = validateAndTransformDoc('update', 'generic', 'default', doc, undefined, true);

      expect(result.id).toBe('entity-generic');
      expect(result.doc).toEqual(
        expect.objectContaining({
          '@timestamp': expect.any(String),
          entity: { id: 'entity-generic' },
        })
      );
    });

    it('throws when doc entity.id does not match generatedId', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc: Entity = { entity: { id: 'doc-id' }, host: { name: 'some-host' } };
      expect(() =>
        validateAndTransformDoc('update', 'generic', 'default', doc, 'generated-id', true)
      ).toThrow(
        new BadCRUDRequestError('Supplied ID doc-id does not match generated EUID generated-id')
      );
    });

    it('uses generatedId when doc entity.id matches', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc: Entity = { entity: { id: 'same-id' }, host: { name: 'some-host' } };
      const result = validateAndTransformDoc('update', 'generic', 'default', doc, 'same-id', true);

      expect(result.id).toBe('same-id');
    });

    it('uses generatedId when doc has no entity.id', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc = { host: { name: 'some-host' } } as Entity;
      const result = validateAndTransformDoc(
        'update',
        'generic',
        'default',
        doc,
        'generated-id',
        true
      );

      expect(result.id).toBe('generated-id');
      expect(doc.entity?.id).toBe('generated-id');
    });

    it('uses doc entity.id when generatedId is undefined', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc: Entity = { entity: { id: 'doc-id' } };
      const result = validateAndTransformDoc('update', 'generic', 'default', doc, undefined, true);

      expect(result.id).toBe('doc-id');
    });

    it('nests entity under typed field for non-generic types', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('host', [createField('host.name')]));

      const doc: Entity = {
        entity: { id: 'entity-host' },
        host: { name: 'original-host-name' },
      };
      const result = validateAndTransformDoc('update', 'host', 'default', doc, undefined, false);

      expect(result.doc['@timestamp']).toEqual(expect.any(String));
      expect(result.doc).not.toHaveProperty('entity');
      expect(result.doc).toHaveProperty('host.entity.id', 'entity-host');
      expect(result.doc).toHaveProperty('host.name', 'original-host-name');
    });

    describe('name defaulting on create vs update', () => {
      it('defaults type.name from entity.id on create when name is not present', () => {
        mockGetEntityDefinition.mockReturnValue(createDefinition('host', []));

        const doc: Entity = { entity: { id: 'entity-host' } };
        const result = validateAndTransformDoc('create', 'host', 'default', doc, undefined, true);

        expect(result.doc).toHaveProperty('host.name', 'entity-host');
      });

      it('does not default type.name on update when name is not present', () => {
        mockGetEntityDefinition.mockReturnValue(createDefinition('host', []));

        const doc: Entity = { entity: { id: 'entity-host' } };
        const result = validateAndTransformDoc('update', 'host', 'default', doc, undefined, true);

        expect(result.doc).not.toHaveProperty('host.name');
      });

      it('preserves existing name on both create and update', () => {
        mockGetEntityDefinition.mockReturnValue(
          createDefinition('host', [createField('host.name')])
        );

        const createDoc: Entity = {
          entity: { id: 'entity-host' },
          host: { name: 'explicit-name' },
        };
        const createResult = validateAndTransformDoc(
          'create',
          'host',
          'default',
          createDoc,
          undefined,
          false
        );
        expect(createResult.doc).toHaveProperty('host.name', 'explicit-name');

        const updateDoc: Entity = {
          entity: { id: 'entity-host' },
          host: { name: 'explicit-name' },
        };
        const updateResult = validateAndTransformDoc(
          'update',
          'host',
          'default',
          updateDoc,
          undefined,
          false
        );
        expect(updateResult.doc).toHaveProperty('host.name', 'explicit-name');
      });
    });

    it('ignores identity source fields from validation', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('host', []));

      const doc: Entity = {
        entity: { id: 'entity-host-identity' },
        host: { name: 'identity-host' },
      };

      expect(() =>
        validateAndTransformDoc('update', 'host', 'default', doc, undefined, false)
      ).not.toThrow();
    });

    it('allows updates for allowAPIUpdate fields', () => {
      mockGetEntityDefinition.mockReturnValue(
        createDefinition('generic', [createField('entity.attributes.watchlists', true)])
      );

      const doc = {
        entity: {
          id: 'entity-allow-update',
          attributes: {
            watchlists: ['privileged_watchlist_id'],
          },
        },
      } as Entity;
      const result = validateAndTransformDoc('update', 'generic', 'default', doc, undefined, false);

      expect(result.doc).toHaveProperty('entity.attributes.watchlists', [
        'privileged_watchlist_id',
      ]);
    });

    it('throws for fields missing from definition', () => {
      mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

      const doc: Entity = {
        entity: {
          id: 'entity-invalid-field',
          attributes: { managed: true },
        },
      };

      expect(() =>
        validateAndTransformDoc('update', 'generic', 'default', doc, undefined, false)
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

      const doc: Entity = {
        entity: {
          id: 'entity-restricted-update',
          attributes: { managed: true },
        },
      };

      expect(() =>
        validateAndTransformDoc('update', 'generic', 'default', doc, undefined, false)
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

      const doc: Entity = {
        entity: {
          id: 'entity-force-update',
          attributes: { managed: true },
        },
      };

      expect(() =>
        validateAndTransformDoc('update', 'generic', 'default', doc, undefined, true)
      ).not.toThrow();
    });

    describe('generic vs typed entity transform', () => {
      it('keeps entity at root level for generic type', () => {
        mockGetEntityDefinition.mockReturnValue(createDefinition('generic', []));

        const doc: Entity = { entity: { id: 'gen-1', type: 'custom' } };
        const result = validateAndTransformDoc(
          'create',
          'generic',
          'default',
          doc,
          undefined,
          true
        );

        expect(result.doc).toHaveProperty('entity.id', 'gen-1');
        expect(result.doc).toHaveProperty('entity.type', 'custom');
        expect(result.doc).toHaveProperty('@timestamp');
      });

      it('nests entity under type key and removes root entity for typed entities', () => {
        mockGetEntityDefinition.mockReturnValue(
          createDefinition('host', [createField('host.name')])
        );

        const doc: Entity = {
          entity: { id: 'host-1', type: 'Host' },
          host: { name: 'my-host' },
        };
        const result = validateAndTransformDoc('update', 'host', 'default', doc, undefined, true);

        expect(result.doc).not.toHaveProperty('entity');
        expect(result.doc).toHaveProperty('host.entity.id', 'host-1');
        expect(result.doc).toHaveProperty('host.entity.type', 'Host');
        expect(result.doc).toHaveProperty('host.name', 'my-host');
        expect(result.doc).toHaveProperty('@timestamp');
      });

      it('creates the type object when not present in typed entity', () => {
        mockGetEntityDefinition.mockReturnValue(createDefinition('service', []));

        const doc: Entity = { entity: { id: 'svc-1' } };
        const result = validateAndTransformDoc(
          'create',
          'service',
          'default',
          doc,
          undefined,
          true
        );

        expect(result.doc).not.toHaveProperty('entity');
        expect(result.doc).toHaveProperty('service.entity.id', 'svc-1');
        expect(result.doc).toHaveProperty('service.name', 'svc-1');
      });
    });

    describe('flattened documents', () => {
      it('handles unflattened doc with generatedId for generic type', () => {
        mockGetEntityDefinition.mockReturnValue(
          createDefinition('generic', [createField('entity.attributes.watchlists', true)])
        );

        // Simulate a flat doc that has been unflattened at the route level
        const doc: Entity = {
          entity: {
            attributes: {
              watchlists: ['privileged_watchlist_id'],
            },
          },
        };
        const result = validateAndTransformDoc(
          'update',
          'generic',
          'default',
          doc,
          'generated-id',
          false
        );

        expect(result.id).toBe('generated-id');
        expect(result.doc).toHaveProperty('entity.id', 'generated-id');
        expect(result.doc).toHaveProperty('entity.attributes.watchlists', [
          'privileged_watchlist_id',
        ]);
      });

      it('handles unflattened doc for host type', () => {
        mockGetEntityDefinition.mockReturnValue(
          createDefinition('host', [createField('host.name')])
        );

        const doc: Entity = {
          entity: { id: 'host:flat-host' },
          host: { name: 'flat-host' },
        };
        const result = validateAndTransformDoc('update', 'host', 'default', doc, undefined, false);

        expect(result.id).toBe('host:flat-host');
        expect(result.doc).not.toHaveProperty('entity');
        expect(result.doc).toHaveProperty('host.entity.id', 'host:flat-host');
        expect(result.doc).toHaveProperty('host.name', 'flat-host');
      });
    });
  });
});
