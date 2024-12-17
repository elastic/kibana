/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManifestSchemaVersion } from '../../../../common/endpoint/schema/common';
import type { InternalArtifactCompleteSchema } from '../../schemas';
import { getArtifactId } from './common';
import { isEmptyManifestDiff, Manifest } from './manifest';
import { getMockArtifacts, toArtifactRecords } from './mocks';

describe('manifest', () => {
  const TEST_POLICY_ID_1 = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';
  const TEST_POLICY_ID_2 = '93c46720-c217-11ea-9906-b5b8a21b268e';
  const ARTIFACT_ID_EXCEPTIONS_MACOS =
    'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_EXCEPTIONS_WINDOWS =
    'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_TRUSTED_APPS_MACOS =
    'endpoint-trustlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_TRUSTED_APPS_WINDOWS =
    'endpoint-trustlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';

  let ARTIFACTS: InternalArtifactCompleteSchema[] = [];
  let ARTIFACTS_COPY: InternalArtifactCompleteSchema[] = [];
  let ARTIFACT_EXCEPTIONS_MACOS: InternalArtifactCompleteSchema;
  let ARTIFACT_EXCEPTIONS_WINDOWS: InternalArtifactCompleteSchema;
  let ARTIFACT_EXCEPTIONS_LINUX: InternalArtifactCompleteSchema;
  let ARTIFACT_TRUSTED_APPS_MACOS: InternalArtifactCompleteSchema;
  let ARTIFACT_TRUSTED_APPS_WINDOWS: InternalArtifactCompleteSchema;
  let ARTIFACT_COPY_EXCEPTIONS_MACOS: InternalArtifactCompleteSchema;
  let ARTIFACT_COPY_EXCEPTIONS_WINDOWS: InternalArtifactCompleteSchema;
  let ARTIFACT_COPY_EXCEPTIONS_LINUX: InternalArtifactCompleteSchema;
  let ARTIFACT_COPY_TRUSTED_APPS_MACOS: InternalArtifactCompleteSchema;
  let ARTIFACT_COPY_TRUSTED_APPS_WINDOWS: InternalArtifactCompleteSchema;

  beforeAll(async () => {
    ARTIFACTS = await getMockArtifacts();
    ARTIFACTS_COPY = await getMockArtifacts();
    ARTIFACT_EXCEPTIONS_MACOS = ARTIFACTS[0];
    ARTIFACT_EXCEPTIONS_WINDOWS = ARTIFACTS[1];
    ARTIFACT_EXCEPTIONS_LINUX = ARTIFACTS[2];
    ARTIFACT_TRUSTED_APPS_MACOS = ARTIFACTS[3];
    ARTIFACT_TRUSTED_APPS_WINDOWS = ARTIFACTS[4];
    ARTIFACT_COPY_EXCEPTIONS_MACOS = ARTIFACTS_COPY[0];
    ARTIFACT_COPY_EXCEPTIONS_WINDOWS = ARTIFACTS_COPY[1];
    ARTIFACT_COPY_EXCEPTIONS_LINUX = ARTIFACTS_COPY[2];
    ARTIFACT_COPY_TRUSTED_APPS_MACOS = ARTIFACTS_COPY[3];
    ARTIFACT_COPY_TRUSTED_APPS_WINDOWS = ARTIFACTS_COPY[4];
  });

  describe('Manifest constructor', () => {
    test('Can create manifest with valid schema version', () => {
      expect(new Manifest()).toBeInstanceOf(Manifest);
    });

    test('Cannot create manifest with invalid schema version', () => {
      expect(() => {
        new Manifest({
          schemaVersion: 'abcd' as ManifestSchemaVersion,
        });
      }).toThrow();
    });

    test('Can create manifest with valid constructor parameters', () => {
      const manifest = new Manifest({
        schemaVersion: 'v1',
        semanticVersion: '1.1.1',
        soVersion: '2.2.2',
      });

      expect(manifest.getAllArtifacts()).toStrictEqual([]);
      expect(manifest.getSchemaVersion()).toBe('v1');
      expect(manifest.getSemanticVersion()).toBe('1.1.1');
      expect(manifest.getSavedObjectVersion()).toBe('2.2.2');
    });
  });

  describe('Manifest.getDefault()', () => {
    test('Creates empty default manifest', () => {
      const manifest = Manifest.getDefault();

      expect(manifest.getAllArtifacts()).toStrictEqual([]);
      expect(manifest.getSchemaVersion()).toBe('v1');
      expect(manifest.getSemanticVersion()).toBe('1.0.0');
      expect(manifest.getSavedObjectVersion()).toBe(undefined);
    });
  });

  describe('bumpSemanticVersion', () => {
    test('Bumps the version properly', () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.1.1' });

      manifest.bumpSemanticVersion();

      expect(manifest.getSemanticVersion()).toBe('1.1.2');
    });
  });

  describe('addEntry', () => {
    test('Adds default artifact', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      expect(manifest.getAllArtifacts()).toStrictEqual([ARTIFACT_EXCEPTIONS_MACOS]);
      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(true);
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set()
      );
    });

    test('Adds policy specific artifact', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.getAllArtifacts()).toStrictEqual([ARTIFACT_EXCEPTIONS_MACOS]);
      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(false);
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1])
      );
    });

    test('Adds same artifact as default and policy specific', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.getAllArtifacts()).toStrictEqual([ARTIFACT_EXCEPTIONS_MACOS]);
      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(true);
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1])
      );
    });

    test('Adds multiple artifacts as default and policy specific', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_LINUX);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS);

      expect(manifest.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(0, 5));
      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(true);
      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_WINDOWS)).toBe(false);
      expect(manifest.isDefaultArtifact(ARTIFACT_TRUSTED_APPS_MACOS)).toBe(true);
      expect(manifest.isDefaultArtifact(ARTIFACT_TRUSTED_APPS_WINDOWS)).toBe(true);
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1])
      );
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_WINDOWS)).toStrictEqual(
        new Set([TEST_POLICY_ID_2])
      );
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_TRUSTED_APPS_MACOS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
      );
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_TRUSTED_APPS_WINDOWS)).toStrictEqual(
        new Set([])
      );
    });

    test('Adding same artifact as default multiple times has no effect', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      expect(manifest.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(0, 1));
      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(true);
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set([])
      );
    });

    test('Adding same artifact as policy specific for same policy multiple times has no effect', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(0, 1));
      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(false);
      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1])
      );
    });
  });

  describe('getAllArtifacts', () => {
    test('Returns empty list initially', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      expect(manifest.getAllArtifacts()).toStrictEqual([]);
    });

    test('Returns only unique artifacts', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);

      expect(manifest.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(0, 2));
    });
  });

  describe('getArtifact', () => {
    test('Returns undefined for non existing artifact id', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      expect(manifest.getArtifact('non-existing-artifact-macos-v1')).toBeUndefined();
    });

    test('Returns default artifact', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);

      expect(manifest.getArtifact(getArtifactId(ARTIFACT_EXCEPTIONS_MACOS))).toStrictEqual(
        ARTIFACT_EXCEPTIONS_MACOS
      );
    });

    test('Returns policy specific artifact', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);

      expect(manifest.getArtifact(getArtifactId(ARTIFACT_EXCEPTIONS_MACOS))).toStrictEqual(
        ARTIFACT_EXCEPTIONS_MACOS
      );
    });
  });

  describe('containsArtifact', () => {
    test('Returns false for artifact that is not in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      expect(manifest.containsArtifact(ARTIFACT_EXCEPTIONS_WINDOWS)).toBe(false);
    });

    test('Returns true for default artifact that is in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);

      expect(manifest.containsArtifact(ARTIFACT_EXCEPTIONS_WINDOWS)).toBe(true);
    });

    test('Returns true for policy specific artifact that is in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);

      expect(manifest.containsArtifact(ARTIFACT_EXCEPTIONS_WINDOWS)).toBe(true);
    });

    test('Returns true for different instances but same ids', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.containsArtifact(ARTIFACT_COPY_EXCEPTIONS_MACOS)).toBe(true);
    });
  });

  describe('isDefaultArtifact', () => {
    test('Returns undefined for artifact that is not in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_WINDOWS)).toBeUndefined();
    });

    test('Returns true for default artifact that is in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(true);
    });

    test('Returns false for policy specific artifact that is in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(false);
    });

    test('Returns true for different instances but same ids', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      expect(manifest.isDefaultArtifact(ARTIFACT_COPY_EXCEPTIONS_MACOS)).toBe(true);
    });
  });

  describe('getArtifactTargetPolicies', () => {
    test('Returns undefined for artifact that is not in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_WINDOWS)).toBeUndefined();
    });

    test('Returns empty set for default artifact that is in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set()
      );
    });

    test('Returns policy set for policy specific artifact that is in the manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_2);

      expect(manifest.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
      );
    });

    test('Returns policy set for different instances but same ids', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_2);

      expect(manifest.getArtifactTargetPolicies(ARTIFACT_COPY_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
      );
    });
  });

  describe('diff', () => {
    test('Returns empty diff between empty manifests', async () => {
      expect(Manifest.getDefault().diff(Manifest.getDefault())).toStrictEqual({
        additions: [],
        removals: [],
        transitions: [],
      });
    });

    test('Returns diff from empty manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_LINUX);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      expect(manifest.diff(Manifest.getDefault())).toStrictEqual({
        additions: ARTIFACTS.slice(0, 4),
        removals: [],
        transitions: [],
      });
    });

    test('Returns empty diff for equal manifests', async () => {
      const manifest1 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS, TEST_POLICY_ID_2);

      const manifest2 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_MACOS);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_WINDOWS);
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_WINDOWS, TEST_POLICY_ID_2);

      expect(manifest2.diff(manifest1)).toStrictEqual({
        additions: [],
        removals: [],
        transitions: [],
      });
    });

    test('Returns additions diff properly', async () => {
      const manifest1 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);

      const manifest2 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_MACOS);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_WINDOWS);

      expect(manifest2.diff(manifest1)).toStrictEqual({
        additions: [ARTIFACT_COPY_TRUSTED_APPS_MACOS, ARTIFACT_COPY_TRUSTED_APPS_WINDOWS],
        removals: [],
        transitions: [],
      });
    });

    test('Returns removals diff properly', async () => {
      const manifest1 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS);

      const manifest2 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_MACOS);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);

      expect(manifest2.diff(manifest1)).toStrictEqual({
        additions: [],
        removals: [ARTIFACT_COPY_TRUSTED_APPS_MACOS, ARTIFACT_COPY_TRUSTED_APPS_WINDOWS],
        transitions: [],
      });
    });

    test('Returns transitions from one policy to another in diff properly', async () => {
      const manifest1 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);

      const manifest2 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_MACOS);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      // policy transition
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      expect(manifest2.diff(manifest1)).toStrictEqual({
        additions: [],
        removals: [],
        transitions: [ARTIFACT_COPY_TRUSTED_APPS_MACOS],
      });
    });

    test('Returns transitions from policy to default in diff properly', async () => {
      const manifest1 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);

      const manifest2 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_MACOS);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      // transition to default
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_MACOS);

      expect(manifest2.diff(manifest1)).toStrictEqual({
        additions: [],
        removals: [],
        transitions: [ARTIFACT_COPY_TRUSTED_APPS_MACOS],
      });
    });

    test('Returns transitions from default to specific policy in diff properly', async () => {
      const manifest1 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS);

      const manifest2 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_MACOS);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      // transition to specific policy
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);

      expect(manifest2.diff(manifest1)).toStrictEqual({
        additions: [],
        removals: [],
        transitions: [ARTIFACT_COPY_TRUSTED_APPS_MACOS],
      });
    });

    test('Returns complex transitions diff properly', async () => {
      const manifest1 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_LINUX);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      const manifest2 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      // transition to default policy only
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_MACOS);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_LINUX);
      // transition to second policy
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      // transition to one policy only
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);

      expect(manifest2.diff(manifest1)).toStrictEqual({
        additions: [],
        removals: [],
        transitions: [
          ARTIFACT_EXCEPTIONS_MACOS,
          ARTIFACT_COPY_EXCEPTIONS_WINDOWS,
          ARTIFACT_COPY_TRUSTED_APPS_MACOS,
        ],
      });
    });

    test('Returns complex diff properly', async () => {
      const manifest1 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest1.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);
      manifest1.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS);

      const manifest2 = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.1' });

      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_MACOS);
      manifest2.addEntry(ARTIFACT_COPY_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest2.addEntry(ARTIFACT_COPY_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);

      expect(manifest2.diff(manifest1)).toStrictEqual({
        additions: [ARTIFACT_COPY_EXCEPTIONS_WINDOWS],
        removals: [ARTIFACT_TRUSTED_APPS_WINDOWS],
        transitions: [ARTIFACT_COPY_EXCEPTIONS_MACOS, ARTIFACT_COPY_TRUSTED_APPS_MACOS],
      });
    });
  });

  describe('toPackagePolicyManifest', () => {
    test('Returns empty manifest', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      expect(manifest.toPackagePolicyManifest()).toStrictEqual({
        schema_version: 'v1',
        manifest_version: '1.0.0',
        artifacts: {},
      });
    });

    test('Returns default policy manifest when no policy id provided', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.toPackagePolicyManifest()).toStrictEqual({
        schema_version: 'v1',
        manifest_version: '1.0.0',
        artifacts: toArtifactRecords({
          'endpoint-exceptionlist-windows-v1': ARTIFACT_EXCEPTIONS_MACOS,
          'endpoint-exceptionlist-macos-v1': ARTIFACT_EXCEPTIONS_WINDOWS,
        }),
      });
    });

    test('Returns default policy manifest when no policy specific artifacts present', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.toPackagePolicyManifest(TEST_POLICY_ID_2)).toStrictEqual({
        schema_version: 'v1',
        manifest_version: '1.0.0',
        artifacts: toArtifactRecords({
          'endpoint-exceptionlist-windows-v1': ARTIFACT_EXCEPTIONS_MACOS,
          'endpoint-exceptionlist-macos-v1': ARTIFACT_EXCEPTIONS_WINDOWS,
        }),
      });
    });

    test('Returns policy specific manifest when policy specific artifacts present', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);

      expect(manifest.toPackagePolicyManifest(TEST_POLICY_ID_2)).toStrictEqual({
        schema_version: 'v1',
        manifest_version: '1.0.0',
        artifacts: toArtifactRecords({
          'endpoint-exceptionlist-windows-v1': ARTIFACT_TRUSTED_APPS_MACOS,
          'endpoint-exceptionlist-macos-v1': ARTIFACT_EXCEPTIONS_WINDOWS,
        }),
      });
    });
  });

  describe('toSavedObject', () => {
    test('Returns empty saved object', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      expect(manifest.toSavedObject()).toStrictEqual({
        schemaVersion: 'v1',
        semanticVersion: '1.0.0',
        artifacts: [],
      });
    });

    test('Returns populated saved object', async () => {
      const manifest = new Manifest({ schemaVersion: 'v1', semanticVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS, TEST_POLICY_ID_2);

      expect(manifest.toSavedObject()).toStrictEqual({
        schemaVersion: 'v1',
        semanticVersion: '1.0.0',
        artifacts: [
          { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: undefined },
          { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: undefined },
          { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: TEST_POLICY_ID_1 },
          { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_1 },
          { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_1 },
          { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_2 },
        ],
      });
    });
  });

  describe('isEmptyManifestDiff', () => {
    test('Returns true when no additions, removals or transitions', async () => {
      expect(isEmptyManifestDiff({ additions: [], removals: [], transitions: [] })).toBe(true);
    });

    test('Returns false when there are additions', async () => {
      const diff = { additions: [ARTIFACT_EXCEPTIONS_MACOS], removals: [], transitions: [] };

      expect(isEmptyManifestDiff(diff)).toBe(false);
    });

    test('Returns false when there are removals', async () => {
      const diff = { additions: [], removals: [ARTIFACT_EXCEPTIONS_MACOS], transitions: [] };

      expect(isEmptyManifestDiff(diff)).toBe(false);
    });

    test('Returns false when there are transitions', async () => {
      const diff = { additions: [], removals: [], transitions: [ARTIFACT_EXCEPTIONS_MACOS] };

      expect(isEmptyManifestDiff(diff)).toBe(false);
    });

    test('Returns false when there are all typesof changes', async () => {
      const diff = {
        additions: [ARTIFACT_EXCEPTIONS_MACOS],
        removals: [ARTIFACT_EXCEPTIONS_WINDOWS],
        transitions: [ARTIFACT_TRUSTED_APPS_MACOS],
      };

      expect(isEmptyManifestDiff(diff)).toBe(false);
    });
  });
});
