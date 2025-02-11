/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidPipelineName, normalizeModelName } from './utils';

describe('ml inference utils', () => {
  describe('isValidPipelineName', () => {
    it('allows alphanumeric characters, underscores, & hypens', () => {
      expect(isValidPipelineName('apipelinename123')).toEqual(true);
      expect(isValidPipelineName('a_pipeline_name123')).toEqual(true);
      expect(isValidPipelineName('a-pipeline-name-123')).toEqual(true);
    });
    it('does not allow spaces', () => {
      expect(isValidPipelineName('a pipeline name')).toEqual(false);
    });
    it('does not allow special characters', () => {
      expect(isValidPipelineName('a_pipeline_name_1$')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1%')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1^')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1"')).toEqual(false);
    });
  });
  describe('normalizeModelName', () => {
    it('no normalization', () => {
      expect(normalizeModelName('valid_model_name_123')).toEqual('valid_model_name_123');
      expect(normalizeModelName('valid-model-name-123')).toEqual('valid-model-name-123');
    });
    it('normalize model name', () => {
      expect(normalizeModelName('.elser_model_2')).toEqual('_elser_model_2');
      expect(normalizeModelName('model!@with#$special%^chars&*123')).toEqual(
        'model__with__special__chars__123'
      );
    });
  });
});
