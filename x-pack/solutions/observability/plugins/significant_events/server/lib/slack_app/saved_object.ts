/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';

export const RELAY_APP_CONNECTION_SO_TYPE = 'relay-app-connection';

/**
 * A single, deployment-wide connection document. The Slack workspace binding is
 * deployment-level (not per-space), so a fixed id + `agnostic` namespace is used.
 *
 * No secrets are stored here. M1 hands the managed ES API key secret to the Relay
 * and keeps only the key id so it can be invalidated. M2
 * (`xpack.actions.relay.uiam.enabled`) stores the UIAM service-account id, which
 * is an identifier and not a credential: the ephemeral token never leaves the
 * security plugin. Kibana has no service-account revoke or update API, so the id
 * is kept after a failed install and after disconnect (`not_connected`). A Relay
 * 403 on a reused id clears it. Using the id still requires `manage_security`.
 */
export const RELAY_APP_CONNECTION_SO_ID = 'relay-app-connection';

const relayAppConnectionAttributesV1 = schema.object({
  status: schema.oneOf([
    schema.literal('not_connected'),
    schema.literal('oauth_in_progress'),
    schema.literal('connected'),
    schema.literal('error'),
  ]),
  // Id of the managed ES API key minted for the Relay; kept so we can invalidate it
  // on disconnect. The secret itself is never stored (it is handed to the Relay).
  apiKeyId: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  // UIAM service-account id for an M2 install. Not a secret. Absent on M1.
  serviceAccountId: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  // Claim id issued at install start; required by the Relay's claim poll
  // (`parseClaimInstallInput` on relay main mandates `claim_id` in the body).
  claimId: schema.maybe(schema.string()),
  // Which external app this connection is for (e.g. 'slack').
  surface: schema.maybe(schema.string()),
  // Relay-side tenant identifier for this binding.
  tenantKey: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  error: schema.maybe(schema.string()),
  createdBy: schema.maybe(schema.string()),
  createdAt: schema.maybe(schema.string()),
  updatedAt: schema.maybe(schema.string()),
});

export type RelayAppConnectionAttributes = TypeOf<typeof relayAppConnectionAttributesV1>;

export const getRelayAppConnectionSavedObjectType = (): SavedObjectsType => ({
  name: RELAY_APP_CONNECTION_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      status: { type: 'keyword', ignore_above: 1024 },
      apiKeyId: { type: 'keyword', ignore_above: 1024 },
      surface: { type: 'keyword', ignore_above: 1024 },
      tenantKey: { type: 'keyword', ignore_above: 1024 },
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: relayAppConnectionAttributesV1.extends({}, { unknowns: 'ignore' }),
        create: relayAppConnectionAttributesV1,
      },
    },
  },
});
