/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { ensureAnonymizationFields } from './anonymization_fields';

const esClientWith = (exists: jest.Mock) => ({ indices: { exists } } as unknown as EsClient);

describe('ensureAnonymizationFields', () => {
  it('reads the anonymization fields in the space, which installs their index', async () => {
    const fetch = jest.fn().mockResolvedValue({}) as jest.Mock & HttpHandler;
    const exists = jest.fn().mockResolvedValue(true);

    await ensureAnonymizationFields({ esClient: esClientWith(exists), fetch });

    expect(fetch).toHaveBeenCalledWith(
      '/api/security_ai_assistant/anonymization_fields/_find?per_page=1',
      expect.objectContaining({ method: 'GET', version: '2023-10-31' })
    );
    expect(exists).toHaveBeenCalledWith({
      index: '.kibana-elastic-ai-assistant-anonymization-fields-default',
    });
  });

  it('checks the index of the requested space', async () => {
    const fetch = jest.fn().mockResolvedValue({}) as jest.Mock & HttpHandler;
    const exists = jest.fn().mockResolvedValue(true);

    await ensureAnonymizationFields({ esClient: esClientWith(exists), fetch, space: 'qa' });

    expect(exists).toHaveBeenCalledWith({
      index: '.kibana-elastic-ai-assistant-anonymization-fields-qa',
    });
  });

  it('throws when the index is still missing', async () => {
    const fetch = jest.fn().mockResolvedValue({}) as jest.Mock & HttpHandler;

    await expect(
      ensureAnonymizationFields({
        esClient: esClientWith(jest.fn().mockResolvedValue(false)),
        fetch,
      })
    ).rejects.toThrow('Open Attack discovery once');
  });

  it('throws with the cause when the route cannot be read', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('forbidden')) as jest.Mock & HttpHandler;
    const exists = jest.fn();

    await expect(
      ensureAnonymizationFields({ esClient: esClientWith(exists), fetch })
    ).rejects.toThrow('Failed to read anonymization fields: forbidden');
    expect(exists).not.toHaveBeenCalled();
  });
});
