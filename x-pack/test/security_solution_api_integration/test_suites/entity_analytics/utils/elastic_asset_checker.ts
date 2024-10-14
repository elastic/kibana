/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '@kbn/ftr-common-functional-services';

export const elasticAssetCheckerFactory = (getService: FtrProviderContext['getService']) => {
  const es = getService('es');

  const expectTransformExists = async (transformId: string) => {
    return expectTransformStatus(transformId, true);
  };

  const expectTransformNotFound = async (transformId: string, attempts: number = 5) => {
    return expectTransformStatus(transformId, false);
  };

  const expectTransformStatus = async (
    transformId: string,
    exists: boolean,
    attempts: number = 5,
    delayMs: number = 2000
  ) => {
    let currentAttempt = 1;
    while (currentAttempt <= attempts) {
      try {
        await es.transform.getTransform({ transform_id: transformId });
        if (!exists) {
          throw new Error(`Expected transform ${transformId} to not exist, but it does`);
        }
        return; // Transform exists, exit the loop
      } catch (e) {
        if (currentAttempt === attempts) {
          if (exists) {
            throw new Error(`Expected transform ${transformId} to exist, but it does not: ${e}`);
          } else {
            return; // Transform does not exist, exit the loop
          }
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        currentAttempt++;
      }
    }
  };

  const expectEnrichPolicyStatus = async (policyId: string, exists: boolean) => {
    try {
      await es.enrich.getPolicy({ name: policyId });
      if (!exists) {
        throw new Error(`Expected enrich policy ${policyId} to not exist, but it does`);
      }
    } catch (e) {
      if (exists) {
        throw new Error(`Expected enrich policy ${policyId} to exist, but it does not: ${e}`);
      }
    }
  };

  const expectEnrichPolicyExists = async (policyId: string) =>
    expectEnrichPolicyStatus(policyId, true);

  const expectEnrichPolicyNotFound = async (policyId: string, attempts: number = 5) =>
    expectEnrichPolicyStatus(policyId, false);

  const expectComponentTemplatStatus = async (templateName: string, exists: boolean) => {
    try {
      await es.cluster.getComponentTemplate({ name: templateName });
      if (!exists) {
        throw new Error(`Expected component template ${templateName} to not exist, but it does`);
      }
    } catch (e) {
      if (exists) {
        throw new Error(
          `Expected component template ${templateName} to exist, but it does not: ${e}`
        );
      }
    }
  };

  const expectComponentTemplateExists = async (templateName: string) =>
    expectComponentTemplatStatus(templateName, true);

  const expectComponentTemplateNotFound = async (templateName: string) =>
    expectComponentTemplatStatus(templateName, false);

  const expectIngestPipelineStatus = async (pipelineId: string, exists: boolean) => {
    try {
      await es.ingest.getPipeline({ id: pipelineId });
      if (!exists) {
        throw new Error(`Expected ingest pipeline ${pipelineId} to not exist, but it does`);
      }
    } catch (e) {
      if (exists) {
        throw new Error(`Expected ingest pipeline ${pipelineId} to exist, but it does not: ${e}`);
      }
    }
  };

  const expectIngestPipelineExists = async (pipelineId: string) =>
    expectIngestPipelineStatus(pipelineId, true);

  const expectIngestPipelineNotFound = async (pipelineId: string) =>
    expectIngestPipelineStatus(pipelineId, false);

  return {
    expectComponentTemplateExists,
    expectComponentTemplateNotFound,
    expectEnrichPolicyExists,
    expectEnrichPolicyNotFound,
    expectIngestPipelineExists,
    expectIngestPipelineNotFound,
    expectTransformExists,
    expectTransformNotFound,
  };
};
