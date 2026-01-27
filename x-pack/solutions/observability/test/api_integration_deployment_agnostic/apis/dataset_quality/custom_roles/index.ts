/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRoleDescriptors } from '@kbn/ftr-common-functional-services';

const noAccessUserRole: KibanaRoleDescriptors = {
  elasticsearch: {
    indices: [],
  },
  kibana: [],
};

const readUserRole: KibanaRoleDescriptors = {
  elasticsearch: {
    indices: [
      {
        names: ['logs-*-*'],
        privileges: ['read'],
      },
    ],
  },
  kibana: [],
};

const datasetQualityMonitorUserRole: KibanaRoleDescriptors = {
  elasticsearch: {
    indices: [
      {
        names: ['logs-*-*', 'metrics-*-*', 'traces-*-*', 'synthetics-*-*'],
        privileges: ['monitor', 'view_index_metadata', 'read'],
      },
    ],
  },
  kibana: [],
};

// Role with monitor privilege but NOT view_index_metadata
// Used to test that canMonitor works with just monitor privilege
const monitorOnlyUserRole: KibanaRoleDescriptors = {
  elasticsearch: {
    indices: [
      {
        names: ['logs-*-*', 'metrics-*-*', 'traces-*-*', 'synthetics-*-*'],
        privileges: ['monitor', 'read'],
      },
    ],
  },
  kibana: [],
};

type CustomRoleNames =
  | 'noAccessUserRole'
  | 'readUserRole'
  | 'datasetQualityMonitorUserRole'
  | 'monitorOnlyUserRole';

export const customRoles: Record<CustomRoleNames, KibanaRoleDescriptors> = {
  noAccessUserRole,
  readUserRole,
  datasetQualityMonitorUserRole,
  monitorOnlyUserRole,
};
