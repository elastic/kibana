/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A union of all valid `owner` values for reference data entries */
export type ReferenceDataOwner = 'EDR';

export interface ReferenceDataSavedObject<Meta extends object = {}> {
  id: string;
  type: string;
  owner: ReferenceDataOwner;
  metadata: Meta;
}
