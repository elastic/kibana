import { SavedObjectsClientContract } from "@kbn/core/server";
import { privilegeMonitoringTypeName } from "./privilege_monitoring_type";
import { PRIVILEGE_MONITORING_ENGINE_STATUS } from "../constants";

interface privilegeMonitoringEngineDescriptorDependencies {
    soClient: SavedObjectsClientContract;
    namespace: string;
}

interface PrivilegedMonitoringEngineDescriptor {
    status: string;
    apiKey: string; 
}

export type PrivilegeMonitoringEngineStatus = 'installing' | 'started' | 'stopped' | 'error';

export class PrivilegeMonitoringEngineDescriptorClient {

    constructor(private readonly deps: privilegeMonitoringEngineDescriptorDependencies) { }

    getSavedObjectId() {
        return `privilege-monitoring-${this.deps.namespace}`;
    }

    async init() {
        const { attributes } = await this.deps.soClient.create<PrivilegedMonitoringEngineDescriptor>(
            privilegeMonitoringTypeName,
            {
              status: PRIVILEGE_MONITORING_ENGINE_STATUS.INSTALLING,
                apiKey: '',
            },
            { id: this.getSavedObjectId() }
          );
          return attributes;
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
    
    async updateStatus(status: PrivilegeMonitoringEngineStatus) {
        return this.update({ status })
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