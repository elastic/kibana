/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsType } from '@kbn/core/server';
import { syntheticsParamType } from '../../common/types/saved_objects';

export const SYNTHETICS_PARAMS_SECRET_ENCRYPTED_TYPE = {
  type: syntheticsParamType,
  attributesToEncrypt: new Set(['value']),
  // `source` is deliberately NOT in the AAD. Adding an attribute to the AAD set
  // in-place is unsafe for zero-downtime upgrades — during a rolling upgrade an
  // older node cannot rebuild the new AAD, so it fails to decrypt `value` for any
  // vault-backed param a newer node wrote. `source` is only non-secret UI metadata
  // that mirrors the already-encrypted ${vault/..} token, so binding it adds no
  // meaningful protection. Keeping the AAD equal to previous releases avoids the
  // ZDU hazard (and the decrypt-corruption when `source` is later cleared).
  attributesToIncludeInAAD: new Set(['key', 'description', 'tags']),
};

export const syntheticsParamSavedObjectType: SavedObjectsType = {
  name: syntheticsParamType,
  hidden: false,
  namespaceType: 'multiple',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
    icon: 'uptimeApp',
  },
};
