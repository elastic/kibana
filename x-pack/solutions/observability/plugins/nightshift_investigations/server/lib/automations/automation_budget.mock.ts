/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { NightshiftAutomationBudgetAttributes } from './types';

/** An in-memory saved objects client that enforces versions like the real one. */
export const createBudgetRepository = () => {
  const documents = new Map<
    string,
    { attributes: NightshiftAutomationBudgetAttributes; version: number }
  >();
  const soClient = savedObjectsClientMock.create();
  soClient.get.mockImplementation(async (type, id) => {
    const document = documents.get(id);
    if (!document) throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    return {
      id,
      type,
      references: [],
      attributes: { ...document.attributes },
      version: String(document.version),
    };
  });
  soClient.create.mockImplementation(async (type, attributes, options) => {
    const id = options?.id ?? '';
    if (documents.has(id)) throw SavedObjectsErrorHelpers.createConflictError(type, id);
    documents.set(id, {
      attributes: { ...(attributes as NightshiftAutomationBudgetAttributes) },
      version: 1,
    });
    return { id, type, references: [], attributes, version: '1' };
  });
  soClient.update.mockImplementation(async (type, id, attributes, options) => {
    const current = documents.get(id);
    if (!current) throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    if (options?.version !== String(current.version))
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    const next = {
      attributes: { ...current.attributes, ...attributes },
      version: current.version + 1,
    };
    documents.set(id, next);
    return { id, type, references: [], attributes: next.attributes, version: String(next.version) };
  });
  return soClient;
};
