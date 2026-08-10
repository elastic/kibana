/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntityIndexPattern } from '@kbn/entity-store/common/domain/entity_index';
import type { RelationshipIntegrationConfig } from '../engine/types';
import {
  buildRawIdentifiersEsqlQuery,
  buildRawIdentifiersExistenceGate,
  type DirectEuidRule,
} from '../engine/build_raw_identifiers_query';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import { ENGINE_COLUMNS } from '../engine/columns';

const RELATIONSHIP_KEY = 'owns';
const OKTA_ENTITY_SOURCE = 'entityanalytics_okta';
const ENTRA_ID_ENTITY_SOURCE = 'entityanalytics_entra_id';
const ENTRA_ID_DEVICE_DATASET = 'entityanalytics_entra_id.device';
const OWNERS = 'device.registered_owners';
const OWNER_MAIL_FIELD = `${OWNERS}.mail`;
const OWNER_ID_FIELD = `${OWNERS}.id`;
const OWNER_UPN_FIELD = `${OWNERS}.user_principal_name`;

// Okta: owns.host.id is an Okta device id. Device entities now key on host.id
// (set by device.yml `set_host_id` tag), so a device's entity.id is
// `host:<device.id>`. This makes host.id directly resolvable as a host EUID —
// unlike AD's host.id which carries an LDAP DN.
// Okta: owns.host.name (device display name) is NOT a resolvable identifier:
// device entities are keyed by id, not display name, so we resolve only host.id.
const OKTA_OWNS_RULES: DirectEuidRule[] = [{ field: 'host.id', euidType: 'host' }];

/**
 * Step 2 ES|QL for the Entra ID `owns` maintainer.
 *
 * Entra ID exposes device ownership only on the *device* object
 * (`registeredOwners`) — there is no user-side "devices I own" field — so this
 * query reads device documents and inverts device→user to emit a user-keyed
 * relationship.
 *
 * `registered_owners` has a plain `object` mapping (not `nested`), so
 * Elasticsearch flattens the array at index time and per-owner correlation is
 * lost. For a device with two owners where only one has a mail address:
 *
 *   device.registered_owners.id                  = [idA, idB]        ← 2 values
 *   device.registered_owners.mail                = [mailB]            ← 1 value (only B)
 *   device.registered_owners.user_principal_name = [upnA, upnB]      ← 2 values
 *
 * A ranked CASE cannot be used here: `CASE(mail IS NOT NULL, mail, ...)` sees
 * `mail IS NOT NULL = true` (because B's mail is present), returns the 1-element
 * mail array, and silently drops owner A who has no mail. The arrays have
 * different lengths and CASE short-circuits on the whole column.
 *
 * The correct approach is `MV_APPEND` — union all three identifier arrays into
 * one multi-valued column, then `MV_EXPAND` to get one row per value. This emits
 * every identifier for every owner regardless of which fields are populated:
 *
 *   ownerKey = [idA, idB, mailB, upnA, upnB]  → 5 rows → 5 actor EUID candidates
 *
 * The entity store's EUID ranking (email > id > name) then determines which
 * candidate resolves to an existing entity document:
 *
 *   mail  → user.email → rank 1 (`user:<mail>@entra_id`)
 *   id    → user.id   → rank 2 (`user:<id>@entra_id`)
 *   upn   → user.name → rank 3 (`user:<upn>@entra_id`)
 *
 * For owner B (has mail): the mail EUID resolves; the id and upn EUIDs 404
 * (entity is keyed by email, not id/upn). This produces notFound hits but is
 * not incorrect — the relationship is still written for the mail EUID.
 *
 * For owner A (no mail): the id EUID resolves if the entity is keyed by id;
 * the upn EUID resolves if keyed by upn.
 *
 * The tradeoff: 2–3× more EUID candidates than owners, with notFound hits for
 * lower-ranked identifiers of owners whose higher-ranked one already resolved.
 * This is the only correct approach when `type: group` destroys per-owner
 * correlation at ingest time.
 */
function buildEntraIdOwnsEsqlQuery(namespace: string): string {
  const logIndex = `logs-${ENTRA_ID_DEVICE_DATASET}-${namespace}`;

  return `FROM ${logIndex}
| WHERE host.id IS NOT NULL
    AND (${OWNER_MAIL_FIELD} IS NOT NULL OR ${OWNER_ID_FIELD} IS NOT NULL OR ${OWNER_UPN_FIELD} IS NOT NULL)
| EVAL targetEntityId = CONCAT("host:", TO_STRING(host.id))
| EVAL ownerKey = MV_APPEND(MV_APPEND(${OWNER_MAIL_FIELD}, ${OWNER_ID_FIELD}), ${OWNER_UPN_FIELD})
| MV_EXPAND ownerKey
| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", ownerKey, "@entra_id")
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
    AND ${ENGINE_COLUMNS.actor} != "user:@entra_id"
    AND ${ENGINE_COLUMNS.actor} RLIKE ".+:.+@.+"
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

export function buildOwnsConfigs(lastProcessedTimestamp?: string): RelationshipIntegrationConfig[] {
  return [
    {
      kind: 'override',
      id: OKTA_ENTITY_SOURCE,
      name: 'Okta Entity Analytics',
      // Step 1 actor discovery reads the entity index (actors are user entity docs).
      indexPattern: getLatestEntityIndexPattern,
      targetEntityType: 'host',
      relationshipKey: RELATIONSHIP_KEY,
      // Discover actors by entity.id (present on every entity). Without this the
      // engine defaults to USER_IDENTITY_FIELDS, which may miss users that lack
      // a canonical email field.
      customActor: {
        fields: ['entity.id'],
      },
      // Entity-index source: disable the engine's @timestamp now-30d lookback (a
      // log-index assumption that would drop entity docs) and gate on last_seen instead.
      disableLookbackWindow: true,
      // Targets are derived from raw_identifiers.host.id — validate before writing
      // to prevent dangling IDs when a device has no entity document.
      validateTargetIds: true,
      compositeAggAdditionalFilters: [
        { term: { 'entity.source': OKTA_ENTITY_SOURCE } },
        buildRawIdentifiersExistenceGate({
          relationshipKey: RELATIONSHIP_KEY,
          fields: ['host.id'],
        }),
        ...(lastProcessedTimestamp
          ? [{ range: { 'entity.lifecycle.last_seen': { gt: lastProcessedTimestamp } } }]
          : []),
      ],
      esqlQueryOverride: (ns) =>
        buildRawIdentifiersEsqlQuery({
          relationshipKey: RELATIONSHIP_KEY,
          rules: OKTA_OWNS_RULES,
          namespace: ns,
          lastProcessedTimestamp,
          entitySource: OKTA_ENTITY_SOURCE,
        }),
    },
    {
      kind: 'override',
      id: ENTRA_ID_ENTITY_SOURCE,
      name: 'Entra ID Entity Analytics',
      // Log-based source: device documents live in the integration's device log
      // data stream, NOT the entity index. Ownership exists only on the device
      // object, so the maintainer reads devices and inverts device→user (see
      // buildEntraIdOwnsEsqlQuery).
      indexPattern: (ns) => `logs-${ENTRA_ID_DEVICE_DATASET}-${ns}`,
      targetEntityType: 'host',
      relationshipKey: RELATIONSHIP_KEY,
      // Actors are owner identifiers on the device doc, not ECS user.* fields.
      // All three are keyword-mapped, so each value of the flattened array
      // becomes its own composite bucket — one bucket per distinct owner.
      // Priority mirrors the entity store's EUID ranking: mail > id > upn.
      customActor: {
        fields: [OWNER_MAIL_FIELD, OWNER_ID_FIELD, OWNER_UPN_FIELD],
      },
      // The target is host:<device.id>, taken from the device doc's own host.id —
      // unambiguous, so there is nothing to validate. See buildEntraIdOwnsEsqlQuery
      // for why the *actor* ambiguity is not addressed by this flag.
      validateTargetIds: false,
      // `disableLookbackWindow` deliberately unset: this is a log index, so the
      // engine's default 30d @timestamp filter both bounds the scan and is the
      // correct freshness signal. Relationship writes merge rather than append,
      // so re-scanning the trailing window each run is idempotent.
      compositeAggAdditionalFilters: [
        // The index pattern already scopes to the device dataset, so no
        // data_stream.dataset term is needed here.
        { exists: { field: 'host.id' } },
        {
          bool: {
            should: [
              { exists: { field: OWNER_MAIL_FIELD } },
              { exists: { field: OWNER_ID_FIELD } },
              { exists: { field: OWNER_UPN_FIELD } },
            ],
            minimum_should_match: 1,
          },
        },
      ],
      // No watermark: `entity.lifecycle.last_seen` is written by the entity-store
      // transform and does not exist on log documents. The lookback window is the
      // bound instead.
      esqlQueryOverride: (ns) => buildEntraIdOwnsEsqlQuery(ns),
    },
  ];
}

// Static export for tests that don't need a watermark.
export const OWNS_INTEGRATION_RELATIONSHIP_CONFIGS = buildOwnsConfigs();
