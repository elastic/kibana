/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { ObservabilityOnboardingRouteHandlerResources } from '../routes/types';
import { getManagedOtlpServiceUrl } from './get_managed_otlp_service_url';

describe('getManagedOtlpServiceUrl()', () => {
  it('returns empty string if APM managed service URL is not set', async () => {
    const plugins = {
      apm: {
        setup: {
          config$: of({
            managedServiceUrl: '',
          }),
        },
      },
    };
    const result = await getManagedOtlpServiceUrl({
      plugins,
    } as unknown as ObservabilityOnboardingRouteHandlerResources);

    expect(result).toBe('');
  });

<<<<<<< HEAD
  it('returns managed OTLP service URL endpoint by converting APM managed service URL and adding port number', async () => {
=======
  it('returns managed OTLP service URL endpoint by converting APM managed service URL', async () => {
>>>>>>> 9e3bce83497 (Move URL generation logic to the server)
    const plugins = {
      apm: {
        setup: {
          config$: of({
<<<<<<< HEAD
            managedServiceUrl: 'https://e2e-tests-c045db.apm.us-east-1.aws.elastic.cloud',
=======
            managedServiceUrl: 'https://e2e-tests-c045db.apm.us-east-1.aws.elastic.cloud:443',
>>>>>>> 9e3bce83497 (Move URL generation logic to the server)
          }),
        },
      },
    };
    const result = await getManagedOtlpServiceUrl({
      plugins,
    } as unknown as ObservabilityOnboardingRouteHandlerResources);

    expect(result).toBe('https://e2e-tests-c045db.ingest.us-east-1.aws.elastic.cloud:443');
  });
});
