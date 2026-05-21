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
  // Shared test config — must satisfy the full EntityStoreConfig schema,
  // including the embedding-resolution settings that are required even
  // though no test below exercises them.
  const baseConfig = {
    syncDelay: duration(60, 'seconds'),
    frequency: duration(60, 'seconds'),
    developer: { pipelineDebugMode: false as const },
    embeddingResolution: {
      inferenceId: '.jina-embeddings-v5-text-small',
      threshold: 0.85,
      k: 10,
      numCandidates: 100,
    },
  };
  describe('host', () => {
    const description = createEngineDescription({
      entityType: 'host',
      namespace: 'test',
      requestParams: defaultOptions,
      defaultIndexPatterns,
      config: baseConfig,
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
      config: baseConfig,
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
      config: baseConfig,
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
  describe('generic', () => {
    const description = createEngineDescription({
      entityType: 'generic',
      namespace: 'test',
      requestParams: defaultOptions,
      defaultIndexPatterns,
      config: baseConfig,
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
