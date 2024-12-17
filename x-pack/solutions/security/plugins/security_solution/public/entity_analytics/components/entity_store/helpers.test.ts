/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUserEntity, sourceFieldToText } from './helpers';
import type {
  Entity,
  UserEntity,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { render } from '@testing-library/react';
import { TestProviders } from '@kbn/timelines-plugin/public/mock';

describe('helpers', () => {
  describe('isUserEntity', () => {
    it('should return true if the record is a UserEntity', () => {
      const userEntity: UserEntity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        user: {
          name: 'test_user',
        },
        entity: {
          name: 'test_user',
          source: 'logs-test',
        },
      };

      expect(isUserEntity(userEntity)).toBe(true);
    });

    it('should return false if the record is not a UserEntity', () => {
      const nonUserEntity: Entity = {
        '@timestamp': '2021-08-02T14:00:00.000Z',
        host: {
          name: 'test_host',
        },
        entity: {
          name: 'test_host',
          source: 'logs-test',
        },
      };

      expect(isUserEntity(nonUserEntity)).toBe(false);
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
