/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getKnowledgeBaseIndices } from '../utils/helpers';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  // Failing: See https://github.com/elastic/kibana/issues/208603
  describe.skip('@ess Security AI Assistant - Indices with `semantic_text` fields', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ignore_fields');
      await esArchiver.load(
        'x-pack/test/functional/es_archives/security_solution/semantic_text_fields'
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/security_solution/ignore_fields');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/security_solution/semantic_text_fields'
      );
    });

    it('should return all existing indices with `semantic_text` fields', async () => {
      const indices = await getKnowledgeBaseIndices({ supertest, log });

      expect(indices).toEqual({ semantic_text_fields: ['content'] });
    });
  });
};
