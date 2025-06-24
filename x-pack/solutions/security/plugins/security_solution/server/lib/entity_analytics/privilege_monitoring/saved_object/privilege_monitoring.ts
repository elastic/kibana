/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';

import type { MonitoringEngineDescriptor } from '../../../../../common/api/entity_analytics/privilege_monitoring/common.gen';
import { privilegeMonitoringTypeName } from './privilege_monitoring_type';
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from '../constants';

interface PrivilegeMonitoringEngineDescriptorDependencies {
  soClient: SavedObjectsClientContract;
  namespace: string;
}

interface PrivilegedMonitoringEngineDescriptor {
  status: MonitoringEngineDescriptor['status'];
  error?: Record<string, unknown> & {
    message?: string;
  };
}

export class PrivilegeMonitoringEngineDescriptorClient {
  constructor(private readonly deps: PrivilegeMonitoringEngineDescriptorDependencies) {}

  getSavedObjectId() {
    return `privilege-monitoring-${this.deps.namespace}`;
  }

  async init() {
    const engineDescriptor = await this.find();
    if (engineDescriptor.total === 1) {
      return this.updateExistingDescriptor(engineDescriptor);
    }
    const { attributes } = await this.deps.soClient.create<PrivilegedMonitoringEngineDescriptor>(
      privilegeMonitoringTypeName,
      {
        status: PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED,
      },
      { id: this.getSavedObjectId() }
    );
    return attributes;
  }

  private async updateExistingDescriptor(
    engineDescriptor: SavedObjectsFindResponse<PrivilegedMonitoringEngineDescriptor, unknown>
  ) {
    const old = engineDescriptor.saved_objects[0].attributes;
    const update = {
      ...old,
      error: undefined,
      status: PRIVILEGE_MONITORING_ENGINE_STATUS.STARTED,
      apiKey: '',
    };
    await this.deps.soClient.update<PrivilegedMonitoringEngineDescriptor>(
      privilegeMonitoringTypeName,
      this.getSavedObjectId(),
      update,
      { refresh: 'wait_for' }
    );
    return update;
  }

  async update(engine: Partial<PrivilegedMonitoringEngineDescriptor>) {
    const id = this.getSavedObjectId();
    const { attributes } = await this.deps.soClient.update<PrivilegedMonitoringEngineDescriptor>(
      privilegeMonitoringTypeName,
      id,
      engine,
      { refresh: 'wait_for' }
    );
    return attributes;
  }

  async updateStatus(status: MonitoringEngineDescriptor['status']) {
    return this.update({ status });
  }

  async find() {
    return this.deps.soClient.find<PrivilegedMonitoringEngineDescriptor>({
      type: privilegeMonitoringTypeName,
      namespaces: [this.deps.namespace],
    });
  }

  async get() {
    const id = this.getSavedObjectId();
    const { attributes } = await this.deps.soClient.get<PrivilegedMonitoringEngineDescriptor>(
      privilegeMonitoringTypeName,
      id
    );
    return attributes;
  }

  async delete() {
    const id = this.getSavedObjectId();
    return this.deps.soClient.delete(privilegeMonitoringTypeName, id);
  }
}
