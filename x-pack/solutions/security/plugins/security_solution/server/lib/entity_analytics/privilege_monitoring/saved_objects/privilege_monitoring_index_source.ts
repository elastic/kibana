/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PRIVILEGE_MONITORING_INDEX_SOURCE_TYPE } from './privilege_monitoring_index_source_type';

interface PrivilegeMonitoringIndexSourceDescriptorDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

export interface PrivilegeMonitoringIndexSourceDescriptor {
  type: 'index';
  managed: boolean;
  indexPattern: string;
}

export class PrivilegeIndexSourceDescriptorClient {
  constructor(private readonly deps: PrivilegeMonitoringIndexSourceDescriptorDependencies) {}

  getSavedObjectId() {
    return `privilege-index-source-${this.deps.namespace}`;
  }

  createIndexSource = async (indexSource: PrivilegeMonitoringIndexSourceDescriptor) => {
    const { attributes } =
      await this.deps.soClient.create<PrivilegeMonitoringIndexSourceDescriptor>(
        PRIVILEGE_MONITORING_INDEX_SOURCE_TYPE,
        {
          type: 'index',
          managed: true,
          indexPattern: 'entity-analytics.privileged-users',
        },
        { id: this.getSavedObjectId() } // TODO double check if this is correct
      );
    return attributes;
  };
}
