/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import { escapeKuery } from '@kbn/es-query';
import type { Paginated, Pagination } from '@kbn/slo-schema';
import { compositeSloDefinitionSchema, storedCompositeSloDefinitionSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/Either';
import type { CompositeSLODefinition, StoredCompositeSLODefinition } from '../domain/models';
import { SLOIdConflict, SLONotFound } from '../errors';
import { SO_SLO_COMPOSITE_TYPE } from '../saved_objects';

interface SearchParams {
  pagination: Pagination;
  search?: string;
  tags?: string[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
}

export interface CompositeSLORepository {
  create(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition>;
  update(compositeSlo: CompositeSLODefinition): Promise<CompositeSLODefinition>;
  findById(id: string): Promise<CompositeSLODefinition>;
  findAllByIds(ids: string[]): Promise<CompositeSLODefinition[]>;
  deleteById(id: string): Promise<void>;
  search(params: SearchParams): Promise<Paginated<CompositeSLODefinition>>;
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

    const storedAttributes = storedCompositeSloDefinitionSchema.encode(compositeSlo);
    await this.soClient.create<StoredCompositeSLODefinition>(
      SO_SLO_COMPOSITE_TYPE,
      storedAttributes
    );

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
    const storedAttributes = storedCompositeSloDefinitionSchema.encode(compositeSlo);
    await this.soClient.create<StoredCompositeSLODefinition>(
      SO_SLO_COMPOSITE_TYPE,
      storedAttributes,
      { id: existingSavedObjectId, overwrite: true }
    );

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

  async search({
    search,
    pagination,
    tags = [],
    sortBy = 'createdAt',
    sortDirection = 'desc',
  }: SearchParams): Promise<Paginated<CompositeSLODefinition>> {
    const filter = [];
    if (tags.length > 0) {
      filter.push(
        `${SO_SLO_COMPOSITE_TYPE}.attributes.tags: (${tags
          .map((tag) => escapeKuery(tag))
          .join(' OR ')})`
      );
    }

    const sortField = sortBy === 'name' ? 'name.keyword' : sortBy;
    const response = await this.soClient.find<StoredCompositeSLODefinition>({
      type: SO_SLO_COMPOSITE_TYPE,
      page: pagination.page,
      perPage: pagination.perPage,
      ...(search ? { search, searchFields: ['name'] } : {}),
      ...(filter.length > 0 ? { filter: filter.join(' AND ') } : {}),
      sortField,
      sortOrder: sortDirection,
    });

    const results = response.saved_objects
      .map((so) => this.toCompositeSLO(so.attributes))
      .filter(this.isCompositeSLO);

    return {
      total: response.total - (response.saved_objects.length - results.length),
      perPage: response.per_page,
      page: response.page,
      results,
    };
  }

  private toCompositeSLO(stored: StoredCompositeSLODefinition): CompositeSLODefinition | undefined {
    const result = compositeSloDefinitionSchema.decode(stored);

    if (isLeft(result)) {
      this.logger.debug(`Invalid stored composite SLO with id [${stored.id}]`);
      return undefined;
    }

    return result.right;
  }

  private isCompositeSLO(slo: CompositeSLODefinition | undefined): slo is CompositeSLODefinition {
    return slo !== undefined;
  }
}
