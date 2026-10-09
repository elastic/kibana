/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { Severity } from '../../common';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { buildInvestigationFilter } from './build_investigation_filter';
import { InvestigationAlreadyExistsError, InvestigationStaleWriteError } from './errors';
import { fromStoredSeverity, toStoredSeverity, type StoredSeverity } from './severity';
import type {
  FindInvestigationsQuery,
  FindInvestigationsResult,
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationRecord,
  InvestigationRepository,
} from './types';

/** Stored severity carries a sortable numeric prefix; callers only ever see the canonical value. */
const toRecord = <Attributes extends Partial<InvestigationAttributes>>(
  { id, version, attributes }: SavedObject<Attributes>,
  logger?: Logger
): Attributes & Pick<InvestigationRecord, 'id' | 'version'> => {
  const severity = fromStoredSeverity(attributes.severity);
  if (attributes.severity !== undefined && severity === undefined) {
    logger?.warn(`Investigation ${id} has an unrecognized stored severity: ${attributes.severity}`);
  }
  return {
    id,
    version,
    ...attributes,
    ...(attributes.severity === undefined ? {} : { severity }),
  };
};

const withStoredSeverity = <T extends { severity?: Severity }>(
  payload: T
): Omit<T, 'severity'> & { severity?: StoredSeverity } => {
  const { severity, ...rest } = payload;
  return severity === undefined ? rest : { ...rest, severity: toStoredSeverity(severity) };
};

/** Text-mapped attributes the free-text `query` searches across. */
const buildSearchFields = (query: FindInvestigationsQuery): string[] | undefined =>
  query.query ? ['title', 'subject_summary', 'summary', 'conclusion'] : undefined;

export type InvestigationSavedObjectsClient = Pick<
  SavedObjectsClientContract,
  'create' | 'get' | 'update' | 'find'
>;

export interface SavedObjectInvestigationRepositoryDeps {
  savedObjectsClient: InvestigationSavedObjectsClient;
  logger?: Logger;
}

export class SavedObjectInvestigationRepository implements InvestigationRepository {
  private readonly savedObjectsClient: InvestigationSavedObjectsClient;

  private readonly logger?: Logger;

  constructor({ savedObjectsClient, logger }: SavedObjectInvestigationRepositoryDeps) {
    this.savedObjectsClient = savedObjectsClient;
    this.logger = logger;
  }

  async create({
    id,
    attributes,
  }: {
    id: string;
    attributes: InvestigationAttributes;
  }): Promise<void> {
    try {
      await this.savedObjectsClient.create(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        withStoredSeverity(attributes),
        { id }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        throw new InvestigationAlreadyExistsError(id);
      }
      throw error;
    }
  }

  async get(id: string): Promise<InvestigationRecord | undefined> {
    try {
      const savedObject = await this.savedObjectsClient.get<InvestigationAttributes>(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        id
      );
      return toRecord(savedObject, this.logger);
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async update({
    id,
    patch,
    version,
  }: {
    id: string;
    patch: InvestigationPatch;
    version?: string;
  }): Promise<void> {
    try {
      await this.savedObjectsClient.update(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        id,
        withStoredSeverity(patch),
        { version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        throw new InvestigationStaleWriteError(id);
      }
      throw error;
    }
  }

  async find<Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes>(
    query: FindInvestigationsQuery<Fields>
  ): Promise<FindInvestigationsResult<Fields>> {
    const result = await this.savedObjectsClient.find<Pick<InvestigationAttributes, Fields>>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      filter: buildInvestigationFilter(query),
      search: query.query,
      searchFields: buildSearchFields(query),
      sortField: query.sortField ?? 'created_at',
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page,
      perPage: query.perPage,
      fields: query.fields,
    });

    return {
      results: result.saved_objects.map((savedObject) => toRecord(savedObject, this.logger)),
      total: result.total,
      page: result.page,
      size: result.per_page,
    };
  }
}
