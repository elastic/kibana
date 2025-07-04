/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration } from 'moment';
import { createEngineDescription } from './engine_description';
import { convertToEntityManagerDefinition } from '../entity_definitions/entity_manager_conversion';
import { defaultOptions } from '../constants';

describe('getUnitedEntityDefinition', () => {
  const defaultIndexPatterns = ['test*'];
  describe('host', () => {
    const description = createEngineDescription({
      entityType: 'host',
      namespace: 'test',
      requestParams: defaultOptions,
      defaultIndexPatterns,
      config: {
        syncDelay: duration(60, 'seconds'),
        frequency: duration(60, 'seconds'),
        developer: { pipelineDebugMode: false },
      },
    });

    it('mapping', () => {
      expect(description.indexMappings).toMatchSnapshot();
    });

    it('entityManagerDefinition', () => {
      const entityManagerDefinition = convertToEntityManagerDefinition(description, {
        namespace: 'test',
        filter: '',
      });

      expect(entityManagerDefinition).toMatchSnapshot();
    });
  });
  describe('user', () => {
    const description = createEngineDescription({
      entityType: 'user',
      namespace: 'test',
      requestParams: defaultOptions,
      defaultIndexPatterns,
      config: {
        syncDelay: duration(60, 'seconds'),
        frequency: duration(60, 'seconds'),
        developer: { pipelineDebugMode: false },
      },
    });

    it('mapping', () => {
      expect(description.indexMappings).toMatchSnapshot();
    });
    it('entityManagerDefinition', () => {
      const entityManagerDefinition = convertToEntityManagerDefinition(description, {
        namespace: 'test',
        filter: '',
      });
      expect(entityManagerDefinition).toMatchSnapshot();
    });
  });

  describe('service', () => {
    const description = createEngineDescription({
      entityType: 'service',
      namespace: 'test',
      requestParams: defaultOptions,
      defaultIndexPatterns,
      config: {
        syncDelay: duration(60, 'seconds'),
        frequency: duration(60, 'seconds'),
        developer: { pipelineDebugMode: false },
      },
    });

    it('mapping', () => {
      expect(description.indexMappings).toMatchSnapshot();
    });

    it('entityManagerDefinition', () => {
      const entityManagerDefinition = convertToEntityManagerDefinition(description, {
        namespace: 'test',
        filter: '',
      });
      expect(entityManagerDefinition).toMatchSnapshot();
    });
  });
});
