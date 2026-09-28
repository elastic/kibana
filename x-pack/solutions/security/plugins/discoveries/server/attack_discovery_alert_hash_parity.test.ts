/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parity guard for the duplicated Attack Discovery alert hash.
 *
 * `generateAttackDiscoveryAlertHash` exists in TWO places, on purpose:
 *
 *   1. `x-pack/solutions/security/packages/kbn-attack-discovery-schedules-common/impl/transforms/transform_to_alert_documents/index.ts`
 *      (an injected `computeSha256Hash` over a single concatenated string)
 *   2. `x-pack/solutions/security/plugins/discoveries/server/routes/post/validate/helpers/transform_to_alert_documents.ts`
 *      (`createHash('sha256')` with incremental `.update()` calls, plus fallbacks
 *      for discoveries with no alert ids)
 *
 * They must agree, because the Attack Discovery v2 workflow uses them at
 * DIFFERENT stages: (1) computes the de-duplication lookup id
 * (`deduplicateScheduledDiscoveries` -> `deduplicateAttackDiscoveries`), while
 * (2) computes the id actually persisted (`persistDiscoveries` step ->
 * `validateAttackDiscoveries` -> `transformToAlertDocuments`). If only one
 * changes, the lookup computes ids that were never persisted and every run
 * silently reports its discoveries as new.
 *
 * The hash is persisted as BOTH `kibana.alert.uuid` and
 * `kibana.alert.instance.id`, and de-duplication searches by
 * `kibana.alert.instance.id`. So the hashes below are hard-coded rather than
 * snapshotted: a snapshot would simply regenerate and hide a shift that gives
 * every customer a duplicate wave on upgrade.
 */

import { createHash } from 'crypto';
import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import {
  generateAttackDiscoveryAlertHash as generateHashFromSharedPackage,
  getGenerationSourceHashSuffix,
} from '@kbn/attack-discovery-schedules-common';

import { generateAttackDiscoveryAlertHash as generateHashFromValidateRoute } from './routes/post/validate/helpers/transform_to_alert_documents';

const computeSha256Hash = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

interface HashArgs {
  alertIds: string[];
  attackDiscoveryId: string | undefined;
  connectorId: string;
  generationSource?: string;
  ownerId: string;
  replacements: Record<string, string> | undefined;
  spaceId: string;
}

const hashFromSharedPackage = ({
  alertIds,
  connectorId,
  generationSource,
  ownerId,
  replacements,
  spaceId,
}: HashArgs): string =>
  generateHashFromSharedPackage({
    attackDiscovery: { alertIds } as AttackDiscovery,
    computeSha256Hash,
    connectorId,
    generationSource,
    ownerId,
    replacements,
    spaceId,
  });

const hashFromValidateRoute = (args: HashArgs): string => generateHashFromValidateRoute(args);

const PLAIN: HashArgs = {
  alertIds: ['alert-2', 'alert-1'],
  attackDiscoveryId: 'discovery-1',
  connectorId: 'connector-1',
  ownerId: 'owner-1',
  replacements: undefined,
  spaceId: 'default',
};

const WITH_REPLACEMENTS: HashArgs = {
  alertIds: ['uuid-1', 'uuid-2'],
  attackDiscoveryId: 'discovery-1',
  connectorId: 'connector-1',
  ownerId: 'owner-1',
  replacements: { 'uuid-1': 'original-2', 'uuid-2': 'original-1' },
  spaceId: 'space-x',
};

const NO_ALERT_IDS_WITH_DISCOVERY_ID: HashArgs = {
  alertIds: [],
  attackDiscoveryId: 'discovery-1',
  connectorId: 'connector-1',
  ownerId: 'owner-1',
  replacements: undefined,
  spaceId: 'default',
};

const NO_ALERT_IDS_NO_DISCOVERY_ID: HashArgs = {
  alertIds: [],
  attackDiscoveryId: undefined,
  connectorId: 'connector-1',
  ownerId: 'owner-1',
  replacements: undefined,
  spaceId: 'default',
};

/**
 * Hashes captured from `main` BEFORE `generationSource` existed. Do NOT
 * regenerate these to make a failing test pass: a change here means existing
 * attack ids shift, and every deployment gets a wave of duplicate attacks the
 * first time it runs after upgrading.
 */
const PINNED_HASHES = {
  plain: 'c4cbd3a00a2aac98c5e8744cad8b7343eae4ad9bbb9965092983b279c54beeb4',
  withReplacements: 'b00329faebb5ad118b4345c963840665b5cfd7b3f6e1e58e45342454de600adb',
  noAlertIdsWithDiscoveryId: '35a34e40fef7a7db0f9600200976c4ff19f2e9e81826cdb9dd441b20d7692eca',
  noAlertIdsNoDiscoveryId: 'e01b17ee62e419b3d3b0dd41d2f7e984bdf9d023e56de2e37f60d08ff5721b4d',
} as const;

/**
 * An arbitrary producer identity. No production caller passes a
 * `generationSource` yet — this only exercises the opt-in mechanism.
 */
const TEST_GENERATION_SOURCE = 'test-producer';

describe('Attack Discovery alert hash parity', () => {
  describe('backward compatibility: omitting generationSource reproduces the pre-existing hashes', () => {
    it('reproduces the pinned hash from the shared package for the plain case', () => {
      expect(hashFromSharedPackage(PLAIN)).toBe(PINNED_HASHES.plain);
    });

    it('reproduces the pinned hash from the validate route for the plain case', () => {
      expect(hashFromValidateRoute(PLAIN)).toBe(PINNED_HASHES.plain);
    });

    it('reproduces the pinned hash from the shared package with replacements', () => {
      expect(hashFromSharedPackage(WITH_REPLACEMENTS)).toBe(PINNED_HASHES.withReplacements);
    });

    it('reproduces the pinned hash from the validate route with replacements', () => {
      expect(hashFromValidateRoute(WITH_REPLACEMENTS)).toBe(PINNED_HASHES.withReplacements);
    });

    it('reproduces the pinned hash for the validate route `attackDiscoveryId` fallback', () => {
      expect(hashFromValidateRoute(NO_ALERT_IDS_WITH_DISCOVERY_ID)).toBe(
        PINNED_HASHES.noAlertIdsWithDiscoveryId
      );
    });

    it('reproduces the pinned hash for the validate route last-resort fallback', () => {
      expect(hashFromValidateRoute(NO_ALERT_IDS_NO_DISCOVERY_ID)).toBe(
        PINNED_HASHES.noAlertIdsNoDiscoveryId
      );
    });

    it('passing generationSource: undefined explicitly is the same as omitting it', () => {
      expect(hashFromSharedPackage({ ...PLAIN, generationSource: undefined })).toBe(
        PINNED_HASHES.plain
      );
      expect(hashFromValidateRoute({ ...PLAIN, generationSource: undefined })).toBe(
        PINNED_HASHES.plain
      );
    });
  });

  describe('the two implementations agree', () => {
    it.each([
      ['plain', PLAIN],
      ['with replacements', WITH_REPLACEMENTS],
    ])('produces the same hash for identical inputs WITHOUT generationSource (%s)', (_, args) => {
      expect(hashFromValidateRoute(args)).toBe(hashFromSharedPackage(args));
    });

    it.each([
      ['plain', PLAIN],
      ['with replacements', WITH_REPLACEMENTS],
    ])('produces the same hash for identical inputs WITH generationSource (%s)', (_, args) => {
      const withSource = {
        ...args,
        generationSource: TEST_GENERATION_SOURCE,
      };

      expect(hashFromValidateRoute(withSource)).toBe(hashFromSharedPackage(withSource));
    });

    it('round trip: the de-duplication lookup hash equals the persisted hash', () => {
      // The v2 workflow computes the lookup id with the shared package and the
      // persisted id with the validate route helper. Both must land on the same
      // value for the SAME producer, or nothing ever de-duplicates.
      const generationSource = TEST_GENERATION_SOURCE;

      const lookupHash = hashFromSharedPackage({ ...PLAIN, generationSource });
      const persistedHash = hashFromValidateRoute({ ...PLAIN, generationSource });

      expect(lookupHash).toBe(persistedHash);
    });
  });

  describe('producer independence', () => {
    it.each([
      ['the shared package', hashFromSharedPackage],
      ['the validate route', hashFromValidateRoute],
    ])('%s: the same alerts and the same generationSource still de-duplicate', (_, generate) => {
      const generationSource = TEST_GENERATION_SOURCE;

      expect(generate({ ...PLAIN, generationSource })).toBe(
        generate({ ...PLAIN, generationSource })
      );
    });

    it.each([
      ['the shared package', hashFromSharedPackage],
      ['the validate route', hashFromValidateRoute],
    ])('%s: the same alerts and DIFFERENT generationSources do NOT de-duplicate', (_, generate) => {
      expect(generate({ ...PLAIN, generationSource: 'producer-a' })).not.toBe(
        generate({ ...PLAIN, generationSource: 'producer-b' })
      );
    });

    it.each([
      ['the shared package', hashFromSharedPackage],
      ['the validate route', hashFromValidateRoute],
    ])(
      '%s: a producer that sets generationSource does NOT collide with one that omits it',
      (_, generate) => {
        expect(
          generate({
            ...PLAIN,
            generationSource: TEST_GENERATION_SOURCE,
          })
        ).not.toBe(generate(PLAIN));
      }
    );

    it.each([
      ['`attackDiscoveryId` fallback', NO_ALERT_IDS_WITH_DISCOVERY_ID],
      ['last-resort fallback', NO_ALERT_IDS_NO_DISCOVERY_ID],
    ])(
      'the validate route carries the suffix through the %s branch, so producer independence does not depend on verifiable alert ids',
      (_, args) => {
        expect(
          hashFromValidateRoute({
            ...args,
            generationSource: TEST_GENERATION_SOURCE,
          })
        ).not.toBe(hashFromValidateRoute(args));

        expect(hashFromValidateRoute({ ...args, generationSource: 'producer-a' })).not.toBe(
          hashFromValidateRoute({ ...args, generationSource: 'producer-b' })
        );
      }
    );
  });

  describe('getGenerationSourceHashSuffix', () => {
    it('returns an empty string when there is no generation source', () => {
      expect(getGenerationSourceHashSuffix(undefined)).toBe('');
    });

    it('returns the delimited suffix when there is a generation source', () => {
      expect(getGenerationSourceHashSuffix('some-producer')).toBe(
        '|generation_source=some-producer'
      );
    });

    it('distinguishes an empty generation source from an absent one', () => {
      // an empty string is a value, not an absence: it must NOT reproduce the
      // pre-existing hash, otherwise a misconfigured producer would silently
      // collide with Kibana Attack Discovery
      expect(getGenerationSourceHashSuffix('')).toBe('|generation_source=');
      expect(hashFromSharedPackage({ ...PLAIN, generationSource: '' })).not.toBe(
        PINNED_HASHES.plain
      );
      expect(hashFromValidateRoute({ ...PLAIN, generationSource: '' })).not.toBe(
        PINNED_HASHES.plain
      );
    });
  });
});
