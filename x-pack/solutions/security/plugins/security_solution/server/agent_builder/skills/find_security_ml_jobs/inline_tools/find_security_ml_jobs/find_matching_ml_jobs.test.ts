/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { EntityType } from '../../../../../../common/api/entity_analytics';
import type { ActiveMlModules } from './find_security_ml_jobs';
import { findMatchingMlJobs } from './find_matching_ml_jobs';

const createMockModel = (invokeResult: {
  jobIds?: string[];
}): { model: ScopedModel; invokeMock: jest.Mock } => {
  const invokeMock = jest.fn().mockResolvedValue(invokeResult);
  const withStructuredOutput = jest.fn().mockReturnValue({ invoke: invokeMock });
  const model = {
    chatModel: {
      withStructuredOutput,
    },
  } as unknown as ScopedModel;
  return { model, invokeMock };
};

const createActiveMlModules = (): ActiveMlModules[] => [
  {
    moduleTitle: 'SIEM Auth',
    moduleDescription: 'Detects anomalous authentication events',
    moduleJobs: [
      { id: 'auth-login', description: 'Login anomalies', isJobStarted: true },
      { id: 'auth-failed', description: 'Failed auth', isJobStarted: false },
    ],
  },
  {
    moduleTitle: 'SIEM Network',
    moduleDescription: 'Network traffic analysis',
    moduleJobs: [{ id: 'network-dns', description: 'DNS anomalies', isJobStarted: true }],
  },
];

describe('findMatchingMlJobs', () => {
  describe('model invocation', () => {
    it('invokes with prompt containing user prompt, entity type, and available modules', async () => {
      const { model, invokeMock } = createMockModel({ jobIds: [] });
      const activeMlModules = createActiveMlModules();
      const prompt = 'Find anomalous logins';
      const entityType = 'user' as EntityType;

      await findMatchingMlJobs({
        activeMlModules,
        entityType,
        model,
        prompt,
      });

      expect(invokeMock).toHaveBeenCalledTimes(1);
      const invokePrompt = invokeMock.mock.calls[0][0];
      expect(invokePrompt).toContain(prompt);
      expect(invokePrompt).toContain(entityType);
      expect(invokePrompt).toContain(JSON.stringify(activeMlModules));
    });
  });

  describe('return value', () => {
    it('returns empty recommendedJobs and recommendedStartedJobIds when model returns empty jobIds', async () => {
      const { model } = createMockModel({ jobIds: [] });
      const activeMlModules = createActiveMlModules();

      const result = await findMatchingMlJobs({
        activeMlModules,
        entityType: 'host' as EntityType,
        model,
        prompt: 'Find anomalies',
      });

      expect(result).toEqual({
        recommendedJobs: [],
        recommendedStartedJobIds: [],
      });
    });

    it('returns matching jobs and only started job ids when model returns matching job IDs', async () => {
      const { model } = createMockModel({
        jobIds: ['auth-login', 'auth-failed', 'network-dns'],
      });
      const activeMlModules = createActiveMlModules();

      const result = await findMatchingMlJobs({
        activeMlModules,
        entityType: 'host' as EntityType,
        model,
        prompt: 'Find anomalies',
      });

      expect(result.recommendedJobs).toHaveLength(3);
      expect(result.recommendedJobs?.map((j) => j.id)).toEqual([
        'auth-login',
        'auth-failed',
        'network-dns',
      ]);
      expect(result.recommendedStartedJobIds).toEqual(['auth-login', 'network-dns']);
    });

    it('returns empty recommendedJobs when model returns job IDs not in activeMlModules', async () => {
      const { model } = createMockModel({
        jobIds: ['unknown-job-1', 'unknown-job-2'],
      });
      const activeMlModules = createActiveMlModules();

      const result = await findMatchingMlJobs({
        activeMlModules,
        entityType: 'host' as EntityType,
        model,
        prompt: 'Find anomalies',
      });

      expect(result.recommendedJobs).toEqual([]);
      expect(result.recommendedStartedJobIds).toEqual([]);
    });

    it('returns partial matches when model returns mix of valid and invalid job IDs', async () => {
      const { model } = createMockModel({ jobIds: ['auth-login', 'invalid-id'] });
      const activeMlModules = createActiveMlModules();

      const result = await findMatchingMlJobs({
        activeMlModules,
        entityType: 'host' as EntityType,
        model,
        prompt: 'Find anomalies',
      });

      expect(result.recommendedJobs).toHaveLength(1);
      expect(result.recommendedJobs?.[0].id).toBe('auth-login');
      expect(result.recommendedStartedJobIds).toEqual(['auth-login']);
    });

    it('handles undefined jobIds from model by defaulting to empty array', async () => {
      const { model } = createMockModel({});
      const activeMlModules = createActiveMlModules();

      const result = await findMatchingMlJobs({
        activeMlModules,
        entityType: 'host' as EntityType,
        model,
        prompt: 'Find anomalies',
      });

      expect(result).toEqual({
        recommendedJobs: [],
        recommendedStartedJobIds: [],
      });
    });
  });

  describe('empty activeMlModules', () => {
    it('returns empty recommendedJobs and recommendedStartedJobIds when activeMlModules is empty', async () => {
      const { model } = createMockModel({ jobIds: ['any-id'] });

      const result = await findMatchingMlJobs({
        activeMlModules: [],
        entityType: 'host' as EntityType,
        model,
        prompt: 'Find anomalies',
      });

      expect(result.recommendedJobs).toEqual([]);
      expect(result.recommendedStartedJobIds).toEqual([]);
    });
  });
});
