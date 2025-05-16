/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamespaceTypeArray } from '@kbn/securitysolution-io-ts-list-types';

import { SavedObjectType } from '../types';
import { getSavedObjectType } from '../get_saved_object_type';

export const getSavedObjectTypes = ({
  namespaceType,
}: {
  namespaceType: NamespaceTypeArray;
}): SavedObjectType[] => {
  return namespaceType.map((singleNamespaceType) =>
    getSavedObjectType({ namespaceType: singleNamespaceType })
  );
};
