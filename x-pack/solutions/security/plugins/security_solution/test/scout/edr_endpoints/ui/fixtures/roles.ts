/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';
import { SECURITY_FEATURE_ID } from '../../../../../common/constants';

export const FEATURE_PRIVILEGES = ['none', 'read', 'all'] as const;

export type FeaturePrivilege = (typeof FEATURE_PRIVILEGES)[number];

interface EndpointListRoleOptions {
  /** Kibana feature `fleetv2` (Fleet). */
  readonly fleet: FeaturePrivilege;
  /** Kibana feature `fleet` (Integrations). */
  readonly integrations: FeaturePrivilege;
}

/**
 * Security `all` with the endpoint list and the given Fleet and Integrations privileges, in every
 * space.
 */
export const getEndpointListRole = ({
  fleet,
  integrations,
}: EndpointListRoleOptions): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        [SECURITY_FEATURE_ID]: ['all', 'endpoint_list_all'],
        fleet: [integrations],
        fleetv2: [fleet],
      },
      spaces: ['*'],
    },
  ],
});
