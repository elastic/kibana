/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { addInferenceEndpoint } from './add_inference_endpoint';

describe('addInferenceEndpoint', () => {
  const mockClient: any = {
    inference: {
      put: jest.fn(),
    },
  };

  const type = 'text_embedding';
  const id = 'es-endpoint-1';
  const config: any = {
    provider: 'elasticsearch',
    taskType: 'text_embedding',
    inferenceId: 'es-endpoint-1',
    providerConfig: {
      num_allocations: 1,
      num_threads: 2,
      model_id: '.multilingual-e5-small',
    },
  };
  const secrets: any = { providerSecrets: {} };
  const mockLogger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the ES client with correct PUT request', async () => {
    await addInferenceEndpoint(mockClient, type, id, config, secrets, mockLogger);

    expect(mockClient.inference.put).toHaveBeenCalledWith({
      inference_id: id,
      task_type: type,
      inference_config: {
        service: 'elasticsearch',
        service_settings: {
          num_allocations: 1,
          num_threads: 2,
          model_id: '.multilingual-e5-small',
        },
        task_settings: {},
      },
    });
  });
});
