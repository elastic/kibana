/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
    SavedObjectsClientContract,
    SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import { EntityType } from '../entity_schema';
import type { EngineDescriptor } from './constants';
import { LogExtractionState, VersionState } from './constants';
import { EngineDescriptorTypeName } from './engine_descriptor_type';
import { ENGINE_STATUS } from '../../constants';

export class EngineDescriptorClient {
    constructor(
        private readonly soClient: SavedObjectsClientContract,
        private readonly namespace: string
    ) { }

    getSavedObjectId(entityType: EntityType) {
        return `${EngineDescriptorTypeName}-${entityType}-${this.namespace}`;
    }

    async find(entityType: EntityType): Promise<SavedObjectsFindResponse<EngineDescriptor>> {
        return this.soClient.find<EngineDescriptor>({
            type: EngineDescriptorTypeName,
            filter: `${EngineDescriptorTypeName}.attributes.type: ${entityType}`,
            namespaces: [this.namespace],
        });
    }

    async init(entityType: EntityType) {
        const defaultLogExtractionState = LogExtractionState.parse({});
        const defaultVersionState = VersionState.parse({});

        const engineDescriptor = await this.find(entityType);

        if (engineDescriptor.total > 0) {
            throw new Error(`Found existing engine descriptor for entity type ${entityType}`);
        }

        const id = this.getSavedObjectId(entityType);

        const { attributes } = await this.soClient.create<EngineDescriptor>(
            EngineDescriptorTypeName,
            {
                status: ENGINE_STATUS.INSTALLING,
                type: entityType,
                logExtractionState: defaultLogExtractionState,
                versionState: defaultVersionState,
            },
            { id }
        );
        return attributes;
    }
}
