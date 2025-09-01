/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { times } from 'lodash';
import { resourceNames } from '@kbn/observability-ai-assistant-plugin/server/service';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  deleteKbIndices,
  addSampleDocsToInternalKb,
  getConcreteWriteIndexFromAlias,
  reIndexKnowledgeBase,
} from '../utils/knowledge_base';
import { createOrUpdateIndexAssets } from '../utils/index_assets';
import { animalSampleDocs } from '../utils/sample_docs';
import {
  deployTinyElserAndSetupKb,
  teardownTinyElserModelAndInferenceEndpoint,
} from '../utils/model_and_inference';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');
  const es = getService('es');

  describe('Knowledge base: POST /internal/observability_ai_assistant/kb/reindex', function () {
    // Intentionally skipped in all serverless environnments (local and MKI)
    // because the migration scenario being tested is not relevant to MKI and Serverless.
    this.tags(['skipServerless']);

    before(async () => {
      await deleteKbIndices(es);
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await deployTinyElserAndSetupKb(getService);
    });

    after(async () => {
      await deleteKbIndices(es);
      await createOrUpdateIndexAssets(observabilityAIAssistantAPIClient);
      await teardownTinyElserModelAndInferenceEndpoint(getService);
    });

    describe('when running multiple re-index operations in parallel', () => {
      let results: Array<{
        status: number;
        errorMessage: string | undefined;
      }>;

      before(async () => {
        await addSampleDocsToInternalKb(getService, animalSampleDocs);

        results = await Promise.all(times(20).map(() => _reIndexKnowledgeBase()));
      });

      it('makes 20 requests to the reindex endpoint', async () => {
        expect(results).to.have.length(20);
      });

      it('only one request should succeed', async () => {
        const successResults = results.filter((result) => result.status === 200);
        expect(successResults).to.have.length(1);
      });

      it('should fail all requests but 1', async () => {
        const failures = results.filter((result) => result.status !== 200);
        expect(failures).to.have.length(19);
      });

      it('should throw a LockAcquisitionException for the failing requests', async () => {
        const failures = results.filter((result) => result.status === 500);
        const errorMessages = failures.every(
          (result) =>
            result.errorMessage === 'Lock "observability_ai_assistant:kb_reindexing" not acquired'
        );

        expect(errorMessages).to.be(true);
      });
    });

    const iterations = 5;
    describe(`when running ${iterations} re-index operations in sequence`, () => {
      let results: Array<{ status: number; success: boolean; errorMessage: string | undefined }>;
      let initialIndexSequenceNumber: number;

      before(async () => {
        const writeIndex = await getConcreteWriteIndexFromAlias(es);
        // get sequence number from write index
        initialIndexSequenceNumber = parseInt(writeIndex.slice(-6), 10);

        results = [];
        for (const _ of times(iterations)) {
          results.push(await _reIndexKnowledgeBase());
        }
      });

      it(`makes ${iterations} requests`, async () => {
        expect(results).to.have.length(iterations);
      });

      it('every re-index operation succeeds', async () => {
        const successResults = results.filter((result) => result.status === 200);
        expect(successResults).to.have.length(iterations);
        expect(successResults.every((r) => r.success === true)).to.be(true);
      });

      it('no requests should fail', async () => {
        const failures = results.filter((result) => result.status !== 200);
        expect(failures).to.have.length(0);
      });

      it('should increment the write index sequence number', async () => {
        const writeIndex = await getConcreteWriteIndexFromAlias(es);
        const sequenceNumber = (iterations + initialIndexSequenceNumber)
          .toString()
          .padStart(6, '0'); // e.g. 000021
        expect(writeIndex).to.be(`${resourceNames.writeIndexAlias.kb}-${sequenceNumber}`);
      });
    });
  });

  async function _reIndexKnowledgeBase() {
    const res = await reIndexKnowledgeBase(observabilityAIAssistantAPIClient);

    return {
      status: res.status,
      success: res.body.success,
      errorMessage: 'message' in res.body ? (res.body.message as string) : undefined,
    };
  }
}
