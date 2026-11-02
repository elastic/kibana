/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { escapeKuery } from '@kbn/es-query';
import { compositeSloDefinitionSchema, storedCompositeSloDefinitionSchema } from '@kbn/slo-schema';
import type { CompositeSLODefinition, StoredCompositeSLODefinition } from '../../domain/models';
import { SLOIdConflict, SLONotFound } from '../../errors';
import { SO_SLO_COMPOSITE_TYPE } from '../../saved_objects';

export interface CompositeSLORepository {
  create(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition>;
  update(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition>;
  findById(id: string): Promise<CompositeSLODefinition>;
  findAllByIds(ids: string[]): Promise<CompositeSLODefinition[]>;
  deleteById(id: string): Promise<void>;
}

export class DefaultCompositeSLORepository implements CompositeSLORepository {
  constructor(private soClient: SavedObjectsClientContract, private logger: Logger) {}

  async create(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition> {
    const existingResponse = await this.soClient.find<StoredCompositeSLODefinition>({
      type: SO_SLO_COMPOSITE_TYPE,
      perPage: 1,
      filter: `${SO_SLO_COMPOSITE_TYPE}.attributes.id:(${escapeKuery(compositeSlo.id)})`,
    });

    if (existingResponse.total > 0) {
      throw new SLOIdConflict(`Composite SLO [${compositeSlo.id}] already exists`);
    }

    const toStore = storedCompositeSloDefinitionSchema.parse(compositeSlo);
    await this.soClient.create<StoredCompositeSLODefinition>(SO_SLO_COMPOSITE_TYPE, toStore);

    return compositeSlo;
  }

  async update(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition> {
    const findResponse = await this.soClient.find<StoredCompositeSLODefinition>({
      type: SO_SLO_COMPOSITE_TYPE,
      perPage: 1,
      filter: `${SO_SLO_COMPOSITE_TYPE}.attributes.id:(${escapeKuery(compositeSlo.id)})`,
    });

    if (findResponse.total === 0) {
      throw new SLONotFound(`Composite SLO [${compositeSlo.id}] not found`);
    }

    const existingSavedObjectId = findResponse.saved_objects[0].id;
    const toStore = storedCompositeSloDefinitionSchema.parse(compositeSlo);
    await this.soClient.create<StoredCompositeSLODefinition>(SO_SLO_COMPOSITE_TYPE, toStore, {
      id: existingSavedObjectId,
      overwrite: true,
    });

    return compositeSlo;
  }

  async findById(id: string): Promise<CompositeSLODefinition> {
    const response = await this.soClient.find<StoredCompositeSLODefinition>({
      type: SO_SLO_COMPOSITE_TYPE,
      page: 1,
      perPage: 1,
      filter: `${SO_SLO_COMPOSITE_TYPE}.attributes.id:(${escapeKuery(id)})`,
    });

    if (response.total === 0) {
      throw new SLONotFound(`Composite SLO [${id}] not found`);
    }

    const compositeSlo = this.toCompositeSLO(response.saved_objects[0].attributes);
    if (compositeSlo === undefined) {
      throw new Error('Invalid stored composite SLO');
    }

    return compositeSlo;
  }

  async findAllByIds(ids: string[]): Promise<CompositeSLODefinition[]> {
    if (ids.length === 0) return [];

    const response = await this.soClient.find<StoredCompositeSLODefinition>({
      type: SO_SLO_COMPOSITE_TYPE,
      page: 1,
      perPage: ids.length,
      filter: `${SO_SLO_COMPOSITE_TYPE}.attributes.id:(${ids
        .map((id) => escapeKuery(id))
        .join(' or ')})`,
    });

    return response.saved_objects
      .map((so) => this.toCompositeSLO(so.attributes))
      .filter(this.isCompositeSLO);
  }

  async deleteById(id: string): Promise<void> {
    const response = await this.soClient.find<StoredCompositeSLODefinition>({
      type: SO_SLO_COMPOSITE_TYPE,
      page: 1,
      perPage: 1,
      filter: `${SO_SLO_COMPOSITE_TYPE}.attributes.id:(${escapeKuery(id)})`,
    });

    if (response.total === 0) {
      throw new SLONotFound(`Composite SLO [${id}] not found`);
    }

    await this.soClient.delete(SO_SLO_COMPOSITE_TYPE, response.saved_objects[0].id);
  }

  private toCompositeSLO(stored: StoredCompositeSLODefinition): CompositeSLODefinition | undefined {
    const result = compositeSloDefinitionSchema.safeParse(stored);

    if (!result.success) {
      this.logger.debug(`Invalid stored composite SLO with id [${stored.id}]`);
      return undefined;
    }

    return result.data;
  }

  private isCompositeSLO(slo: CompositeSLODefinition | undefined): slo is CompositeSLODefinition {
    return slo !== undefined;
  }
}
