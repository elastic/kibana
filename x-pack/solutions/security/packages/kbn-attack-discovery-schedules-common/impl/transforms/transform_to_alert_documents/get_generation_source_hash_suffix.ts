/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The optional `generationSource` contributor to the attack discovery alert hash.
 *
 * The attack hash is persisted as both `kibana.alert.uuid` and
 * `kibana.alert.instance.id`, and de-duplication searches by
 * `kibana.alert.instance.id`. Appending a suffix only when `generationSource` is
 * provided means:
 *
 * - a producer that passes a `generationSource` never collides with attacks
 *   another producer built from the same detection alerts, connector, owner and
 *   space
 * - repeated runs of the same producer still de-duplicate, because the suffix is
 *   stable for a given `generationSource`
 * - every current caller omits it and therefore reproduces the hashes already
 *   persisted, byte for byte — there is no duplicate wave on upgrade
 *
 * No caller passes a `generationSource` today: this is the opt-in mechanism for
 * future producers that write to the same Attack Discovery index.
 *
 * IMPORTANT: there are two independent implementations of
 * `generateAttackDiscoveryAlertHash` (one in this package, one in the
 * `discoveries` plugin's validate route helpers). They are used at different
 * stages of the Attack Discovery v2 workflow — one for the de-duplication
 * lookup, one for the persisted id — so they MUST agree. Both call this helper
 * so the suffix cannot drift between them.
 */
export const getGenerationSourceHashSuffix = (generationSource: string | undefined): string =>
  generationSource == null ? '' : `|generation_source=${generationSource}`;
