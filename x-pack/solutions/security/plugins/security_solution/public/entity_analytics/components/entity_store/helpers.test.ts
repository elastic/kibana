/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityType, sanitizeEntityRecordForUpsert, sourceFieldToText } from './helpers';
import { render } from '@testing-library/react';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import type {
  Entity,
  HostEntity,
  ServiceEntity,
  UserEntity,
  GenericEntity,
} from '../../../../common/api/entity_analytics';

describe('helpers', () => {
  describe('getEntityType', () => {
    it('should return "user" if the record is a UserEntity', () => {
      const userEntity: UserEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        user: {
          name: 'test_user',
        },
        entity: {
          id: 'test_user',
          name: 'test_user',
          source: 'logs-test',
          type: 'AWS IAM User',
          EngineMetadata: {
            Type: 'user',
          },
        },
      };

      expect(getEntityType(userEntity)).toBe('user');
    });

    it('should return "user" if the record is a UserEntity (with user.entity)', () => {
      const userEntity: UserEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        user: {
          name: 'test_user',
        },
        entity: {
          id: 'test_user',
          name: 'test_user',
          source: 'logs-test',
          type: 'user',
        },
      };

      expect(getEntityType(userEntity)).toBe('user');
    });

    it('should return "host" if the record is a HostEntity', () => {
      const hostEntity: HostEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        host: {
          name: 'test_host',
        },
        entity: {
          id: 'test_host',
          name: 'test_host',
          source: 'logs-test',
          type: 'EC2 Instance',
          EngineMetadata: {
            Type: 'host',
          },
        },
      };

      expect(getEntityType(hostEntity)).toBe('host');
    });

    it('should return "host" if the record is a HostEntity (with entity.type)', () => {
      const hostEntity: HostEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        host: {
          name: 'test_host',
        },
        entity: {
          id: 'test_host',
          name: 'test_host',
          source: 'logs-test',
          type: 'host',
        },
      };

      expect(getEntityType(hostEntity)).toBe('host');
    });

    it('should return "service" if the record is a ServiceEntity', () => {
      const serviceEntity: ServiceEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        service: {
          name: 'test_service',
        },
        entity: {
          id: 'test_service',
          name: 'test_service',
          source: 'logs-test',
          type: 'SaaS',
          EngineMetadata: {
            Type: 'service',
          },
        },
      };

      expect(getEntityType(serviceEntity)).toBe('service');
    });

    it('should return "service" if the record is a ServiceEntity (with entity.type)', () => {
      const serviceEntity: ServiceEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        service: {
          name: 'test_service',
        },
        entity: {
          id: 'test_service',
          name: 'test_service',
          source: 'logs-test',
          type: 'service',
        },
      };

      expect(getEntityType(serviceEntity)).toBe('service');
    });

    it('should return "generic" if the record is a ServiceEntity', () => {
      const genericEntity: GenericEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        entity: {
          id: 'arn',
          name: 'test_generic',
          source: 'logs-test',
          type: 'PostgreSQL Database',
          EngineMetadata: {
            Type: 'generic',
          },
        },
      };

      expect(getEntityType(genericEntity)).toBe('generic');
    });

    it('should return "generic" if the record is a ServiceEntity (with entity.type)', () => {
      const genericEntity: GenericEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        entity: {
          id: 'arn',
          name: 'test_generic',
          source: 'logs-test',
          type: 'generic',
        },
      };

      expect(getEntityType(genericEntity)).toBe('generic');
    });

    it('should return "host" when flattened record has entity.type "Host"', () => {
      const record = { 'entity.type': 'Host' } as unknown as Entity;
      expect(getEntityType(record)).toBe('host');
    });

    it('should return "user" when flattened record has entity.type "Identity"', () => {
      const record = { 'entity.type': 'Identity' } as unknown as Entity;
      expect(getEntityType(record)).toBe('user');
    });

    it('should return "service" when flattened record has entity.type "Service"', () => {
      const record = { 'entity.type': 'Service' } as unknown as Entity;
      expect(getEntityType(record)).toBe('service');
    });

    it('should throw an error if the record does not match any entity type', () => {
      const unknownEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        entity: {
          name: 'unknown_entity',
          source: 'logs-test',
        },
      } as unknown as Entity;

      expect(() => getEntityType(unknownEntity)).toThrow(
        'Unexpected entity: {"@timestamp":"2021-08-02T14:00:00.000Z","entity":{"name":"unknown_entity","source":"logs-test"}}'
      );
    });
  });

  describe('sanitizeEntityRecordForUpsert', () => {
    it('strips top-level agent and keeps only allowed HostEntity keys', () => {
      const recordWithExtras = {
        '@timestamp': '2026-03-04T15:24:56.317Z',
        entity: {
          id: 'host:B377958D-B4A8-5FCA-B237-F2DE40404617',
          name: 'MacBookPro.localdomain',
          EngineMetadata: { Type: 'host', UntypedId: 'B377958D-B4A8-5FCA-B237-F2DE40404617' },
        },
        host: { name: 'MacBookPro.localdomain' },
        agent: { id: 'bbcb2260-62b6-45ae-8e9a-4077419e38a7', type: 'auditbeat' },
        asset: { criticality: 'high_impact' },
      } as unknown as Entity;

      const out = sanitizeEntityRecordForUpsert(recordWithExtras);

      expect(out).not.toHaveProperty('agent');
      expect(out).toHaveProperty('entity');
      expect(out).toHaveProperty('host');
      expect(out).toHaveProperty('asset');
      expect((out as HostEntity).asset?.criticality).toBe('high_impact');
    });

    it('omits entity.EngineMetadata so backend does not reject it as not allowed to be updated', () => {
      const recordWithUntypedId = {
        entity: {
          id: 'host:abc-123',
          name: 'myhost',
          EngineMetadata: { Type: 'host', UntypedId: 'B377958D-B4A8-5FCA-B237-F2DE40404617' },
        },
        host: { name: 'myhost' },
      } as unknown as Entity;

      const out = sanitizeEntityRecordForUpsert(recordWithUntypedId);

      expect(out.entity.EngineMetadata).toBeUndefined();
    });
  });

  describe('sourceFieldToText', () => {
    it("should return 'Events' if the value isn't risk or asset", () => {
      const { container } = render(sourceFieldToText('anything'), {
        wrapper: TestProviders,
      });

      expect(container).toHaveTextContent('Events');
    });

    it("should return 'Risk' if the value is a risk index", () => {
      const { container } = render(sourceFieldToText('risk-score.risk-score-default'), {
        wrapper: TestProviders,
      });

      expect(container).toHaveTextContent('Risk');
    });

    it("should return 'Asset Criticality' if the value is a asset criticality index", () => {
      const { container } = render(sourceFieldToText('.asset-criticality.asset-criticality-*'), {
        wrapper: TestProviders,
      });

      expect(container).toHaveTextContent('Asset Criticality');
    });
  });
});
