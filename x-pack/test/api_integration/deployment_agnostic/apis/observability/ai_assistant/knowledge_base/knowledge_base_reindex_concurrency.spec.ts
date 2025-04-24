/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { times } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import {
  deleteKnowledgeBaseModel,
  setupKnowledgeBase,
  deleteKbIndices,
  addSampleDocsToInternalKb,
} from '../utils/knowledge_base';
import { createOrUpdateIndexAssets } from '../utils/index_assets';
import { animalSampleDocs } from '../utils/sample_docs';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  describe('POST /internal/observability_ai_assistant/kb/reindex', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      await deleteKbIndices(es);
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await setupKnowledgeBase(getService);
    });

    after(async () => {
      await deleteKbIndices(es);
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await deleteKnowledgeBaseModel(getService);
    });

    describe('when running multiple re-index operations in parallel', () => {
      let results: Array<{
        status: number;
        errorMessage: string | undefined;
      }>;

      before(async () => {
        await addSampleDocsToInternalKb(getService, animalSampleDocs);

        results = await Promise.all(times(20).map(() => reIndexKnowledgeBase()));
      });

      it('makes 20 requests to the reindex endpoint', async () => {
        expect(results).to.have.length(20);
      });

      it('only one request should succeed', async () => {
        const successResults = results.filter((result) => result.status === 200);
        expect(successResults).to.have.length(1);
      });

      it('should fail every request but 1', async () => {
        const failures = results.filter((result) => result.status !== 200);
        expect(failures).to.have.length(19);
      });

      it('throw a LockAcquisitionException for the failing requests', async () => {
        const failures = results.filter((result) => result.status === 500);
        const errorMessages = failures.every(
          (result) =>
            result.errorMessage === 'Lock "observability_ai_assistant:kb_reindexing" not acquired'
        );

        expect(errorMessages).to.be(true);
      });
    });

    describe('when running multiple re-index operations in sequence', () => {
      let results: Array<{ status: number; result: boolean; errorMessage: string | undefined }>;

      before(async () => {
        results = [];
        for (const _ of times(20)) {
          results.push(await reIndexKnowledgeBase());
        }
      });

      it('makes 20 requests', async () => {
        expect(results).to.have.length(20);
      });

      it('every re-index operation succeeds', async () => {
        const successResults = results.filter((result) => result.status === 200);
        expect(successResults).to.have.length(20);
        expect(successResults.every((r) => r.result === true)).to.be(true);
      });

      it('no requests should fail', async () => {
        const failures = results.filter((result) => result.status !== 200);
        expect(failures).to.have.length(0);
      });
    });
  });

  async function reIndexKnowledgeBase() {
    const res = await observabilityAIAssistantAPIClient.editor({
      endpoint: 'POST /internal/observability_ai_assistant/kb/reindex',
    });

    return {
      status: res.status,
      result: res.body.result,
      errorMessage: 'message' in res.body ? (res.body.message as string) : undefined,
    };
  }
}
