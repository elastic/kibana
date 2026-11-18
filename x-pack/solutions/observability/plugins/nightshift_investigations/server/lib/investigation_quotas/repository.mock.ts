/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { InvestigationQuotaGroup } from '../../../common/investigation_quotas';
import {
  NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
  type NightshiftInvestigationQuotaLedgerAttributes,
} from '../../saved_objects';
import {
  getInvestigationQuotaLedgerId,
  readInvestigationQuotaLedger,
  type InvestigationQuotaSavedObjectsRepository,
} from './repository';

interface StoredSavedObject {
  attributes: object;
  version: number;
}

// `JSON.parse` returns `any`, which lets the in-memory store hand back whatever attributes type the
// caller asked for without a cast.
const clone = (value: unknown) => JSON.parse(JSON.stringify(value));

/** An in-memory saved objects repository with optimistic concurrency and injectable failures. */
export const createInvestigationQuotaRepositoryMock = () => {
  const documents = new Map<string, StoredSavedObject>();
  const key = (type: string, id: string) => `${type}:${id}`;
  const getErrors: Error[] = [];
  const createErrors: Error[] = [];
  const updateErrorsById = new Map<string, Error>();
  let beforeNextCreate: ((type: string, id: string) => void) | undefined;

  const client: InvestigationQuotaSavedObjectsRepository = {
    get: async (type, id) => {
      await Promise.resolve();
      const failure = getErrors.shift();
      if (failure) {
        throw failure;
      }
      const document = documents.get(key(type, id));
      if (!document) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return {
        type,
        id,
        attributes: clone(document.attributes),
        references: [],
        version: String(document.version),
      };
    },
    create: async (type, attributes, options = {}) => {
      await Promise.resolve();
      const id = options.id ?? 'generated';
      const hook = beforeNextCreate;
      beforeNextCreate = undefined;
      hook?.(type, id);
      const failure = createErrors.shift();
      if (failure) {
        throw failure;
      }
      const documentKey = key(type, id);
      if (documents.has(documentKey) && !options.overwrite) {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }
      const version = (documents.get(documentKey)?.version ?? 0) + 1;
      documents.set(documentKey, { attributes: clone(attributes), version });
      return { type, id, attributes: clone(attributes), references: [], version: String(version) };
    },
    update: async (type, id, attributes, options = {}) => {
      await Promise.resolve();
      const failure = updateErrorsById.get(id);
      if (failure) {
        updateErrorsById.delete(id);
        throw failure;
      }
      const documentKey = key(type, id);
      const current = documents.get(documentKey);
      if (!current) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      if (options.version !== String(current.version)) {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }
      const next = { ...current.attributes, ...clone(attributes) };
      documents.set(documentKey, { attributes: next, version: current.version + 1 });
      return {
        type,
        id,
        attributes: clone(next),
        references: [],
        version: String(current.version + 1),
      };
    },
  };

  return {
    client,
    count: async (date: string, group: InvestigationQuotaGroup) =>
      (await readInvestigationQuotaLedger(client, date, group)).count,
    seedLedger: (date: string, group: InvestigationQuotaGroup, count: number) => {
      const attributes: NightshiftInvestigationQuotaLedgerAttributes = { date, group, count };
      documents.set(
        key(
          NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
          getInvestigationQuotaLedgerId(date, group)
        ),
        { attributes, version: 1 }
      );
    },
    failNextGet: (error: Error) => {
      getErrors.push(error);
    },
    failNextCreate: (error: Error) => {
      createErrors.push(error);
    },
    /** Fails the next update of the saved object with this id. */
    failNextUpdateOf: (id: string, error: Error) => {
      updateErrorsById.set(id, error);
    },
    onNextCreate: (hook: (type: string, id: string) => void) => {
      beforeNextCreate = hook;
    },
  };
};
