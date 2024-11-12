/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '@kbn/ftr-common-functional-services';

export const elasticAssetCheckerFactory = (getService: FtrProviderContext['getService']) => {
  const es = getService('es');
  const retry = getService('retry');
  const log = getService('log');

  const expectTransformExists = async (transformId: string) => {
    return expectTransformStatus(transformId, true);
  };

  const expectTransformNotFound = async (transformId: string, attempts: number = 5) => {
    return expectTransformStatus(transformId, false);
  };

  const expectTransformStatus = async (transformId: string, exists: boolean) => {
    await retry.waitForWithTimeout(
      `transform ${transformId} to ${exists ? 'exist' : 'not exist'}`,
      10_000,
      async () => {
        try {
          await es.transform.getTransform({ transform_id: transformId });
          return exists;
        } catch (e) {
          log.debug(`Transform ${transformId} not found: ${e}`);
          return !exists;
        }
      }
    );
  };

  const expectEnrichPolicyStatus = async (policyId: string, exists: boolean) => {
    await retry.waitForWithTimeout(
      `enrich policy ${policyId} to ${exists ? 'exist' : 'not exist'}`,
      20_000,
      async () => {
        try {
          const res = await es.enrich.getPolicy({ name: policyId });
          const policy = res.policies?.[0];
          if (policy) {
            log.debug(`Enrich policy ${policyId} found: ${JSON.stringify(res)}`);
            return exists;
          } else {
            log.debug(`Enrich policy ${policyId} not found: ${JSON.stringify(res)}`);
            return !exists;
          }
        } catch (e) {
          log.debug(`Enrich policy ${policyId} not found: ${e}`);
          return !exists;
        }
      }
    );
  };

  const expectEnrichPolicyExists = async (policyId: string) =>
    expectEnrichPolicyStatus(policyId, true);

  const expectEnrichPolicyNotFound = async (policyId: string, attempts: number = 5) =>
    expectEnrichPolicyStatus(policyId, false);

  const expectComponentTemplatStatus = async (templateName: string, exists: boolean) => {
    await retry.waitForWithTimeout(
      `component template ${templateName} to ${exists ? 'exist' : 'not exist'}`,
      10_000,
      async () => {
        try {
          await es.cluster.getComponentTemplate({ name: templateName });
          return exists; // Component template exists
        } catch (e) {
          log.debug(`Component template ${templateName} not found: ${e}`);
          return !exists; // Component template does not exist
        }
      }
    );
  };

  const expectComponentTemplateExists = async (templateName: string) =>
    expectComponentTemplatStatus(templateName, true);

  const expectComponentTemplateNotFound = async (templateName: string) =>
    expectComponentTemplatStatus(templateName, false);

  const expectIngestPipelineStatus = async (pipelineId: string, exists: boolean) => {
    await retry.waitForWithTimeout(
      `ingest pipeline ${pipelineId} to ${exists ? 'exist' : 'not exist'}`,
      10_000,
      async () => {
        try {
          await es.ingest.getPipeline({ id: pipelineId });
          return exists; // Ingest pipeline exists
        } catch (e) {
          log.debug(`Ingest pipeline ${pipelineId} not found: ${e}`);
          return !exists; // Ingest pipeline does not exist
        }
      }
    );
  };

  const expectIngestPipelineExists = async (pipelineId: string) =>
    expectIngestPipelineStatus(pipelineId, true);

  const expectIngestPipelineNotFound = async (pipelineId: string) =>
    expectIngestPipelineStatus(pipelineId, false);

  const expectIndexStatus = async (indexName: string, exists: boolean) => {
    try {
      await es.indices.get({ index: indexName });
      if (!exists) {
        throw new Error(`Expected index ${indexName} to not exist, but it does`);
      }
    } catch (e) {
      if (exists) {
        throw new Error(`Expected index ${indexName} to exist, but it does not: ${e}`);
      }
    }
  };

  const expectEntitiesIndexExists = async (entityType: string, namespace: string) =>
    expectIndexStatus(`.entities.v1.latest.security_${entityType}_${namespace}`, true);

  const expectEntitiesIndexNotFound = async (entityType: string, namespace: string) =>
    expectIndexStatus(`.entities.v1.latest.security_${entityType}_${namespace}`, false);

  return {
    expectComponentTemplateExists,
    expectComponentTemplateNotFound,
    expectEnrichPolicyExists,
    expectEnrichPolicyNotFound,
    expectIngestPipelineExists,
    expectIngestPipelineNotFound,
    expectEntitiesIndexExists,
    expectEntitiesIndexNotFound,
    expectTransformExists,
    expectTransformNotFound,
  };
};
