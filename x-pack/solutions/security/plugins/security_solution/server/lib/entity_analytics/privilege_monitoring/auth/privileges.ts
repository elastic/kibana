/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRIVILEGE_MONITORING_INTERNAL_INDICES_PATTERN } from '../constants';
import { privilegeMonitoringTypeName } from '../saved_objects';

export const privilegeMonitoringRuntimePrivileges = (sourceIndices: string[]) => ({
  cluster: ['manage_ingest_pipelines', 'manage_index_templates'],
  index: [
    {
      names: [PRIVILEGE_MONITORING_INTERNAL_INDICES_PATTERN],
      privileges: ['create_index', 'delete_index', 'index', 'create_doc', 'auto_configure', 'read'],
    },
    {
      names: [...sourceIndices, PRIVILEGE_MONITORING_INTERNAL_INDICES_PATTERN],
      privileges: ['read', 'view_index_metadata'],
    },
  ],
  application: [
    {
      application: 'kibana-.kibana',
      privileges: [`saved_object:${privilegeMonitoringTypeName}/*`],
      resources: ['*'],
    },
  ],
});
