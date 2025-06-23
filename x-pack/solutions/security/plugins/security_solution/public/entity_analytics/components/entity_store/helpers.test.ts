/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityType, sourceFieldToText } from './helpers';
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
