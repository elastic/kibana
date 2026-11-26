/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import { RULE_LIBRARY_SO_TYPE } from '../constants';

// ESO matches flat top-level names only, so `secret` is encrypted and the whole `provider` object is bound in the AAD.
export const ruleLibraryEncryption: EncryptedSavedObjectTypeRegistration = {
  type: RULE_LIBRARY_SO_TYPE,
  attributesToEncrypt: new Set(['secret']),
  attributesToIncludeInAAD: new Set(['provider']),
  // Library id is a public key (`elastic`), not a secret.
  enforceRandomId: false,
};
