/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { StoredSLODefinition } from '../domain/models';
import { SO_SLO_TYPE } from '../saved_objects';

export interface SLOValidator {
  exists(id: string, namespaces?: string[]): Promise<boolean>;
}

export class KibanaSavedObjectsSLOValidator implements SLOValidator {
  constructor(private internalSOClient: SavedObjectsClientContract) {}

  async exists(id: string, namespaces = []) {
    const findResponse = await this.internalSOClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      perPage: 0,
      filter: `slo.attributes.id:(${id})`,
      namespaces: [...namespaces],
    });

    return findResponse.total > 0;
  }
}
