/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap, isEqual } from 'lodash';
import semver from 'semver';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import type {
  InternalArtifactSchema,
  InternalManifestSchema,
  InternalManifestEntrySchema,
  InternalArtifactCompleteSchema,
} from '../../schemas/artifacts';
import type {
  ManifestSchemaVersion,
  SemanticVersion,
} from '../../../../common/endpoint/schema/common';
import { semanticVersion } from '../../../../common/endpoint/schema/common';
import type { ManifestSchema } from '../../../../common/endpoint/schema/manifest';
import { manifestSchema } from '../../../../common/endpoint/schema/manifest';
import { ManifestEntry } from './manifest_entry';
import { getArtifactId } from './common';
import type { ManifestVersion } from '../../schemas/artifacts/manifest';
import { manifestVersion } from '../../schemas/artifacts/manifest';

function createInternalManifestEntries(
  artifactIds: string[],
  policyId?: string
): InternalManifestEntrySchema[] {
  return artifactIds.map((artifactId) => ({ policyId, artifactId }));
}

export interface ManifestDiff {
  additions: InternalArtifactSchema[];
  removals: InternalArtifactSchema[];
  transitions: InternalArtifactSchema[];
}

export function isEmptyManifestDiff(diff: ManifestDiff) {
  return diff.additions.length === 0 && diff.removals.length === 0 && diff.transitions.length === 0;
}

interface ManifestEntryDescriptor {
  isDefaultEntry: boolean;
  specificTargetPolicies: Set<string>;
  entry: ManifestEntry;
}

function addValueToSet<T>(set?: Set<T>, value?: T) {
  return new Set([...(set?.values() || []), ...(value !== undefined ? [value] : [])]);
}

export class Manifest {
  private readonly allEntries: Map<string, ManifestEntryDescriptor>;
  private readonly defaultEntries: Map<string, ManifestEntry>;
  private readonly policySpecificEntries: Map<string, Map<string, ManifestEntry>>;
  private version: ManifestVersion;

  constructor(version?: Partial<ManifestVersion>) {
    this.allEntries = new Map();
    this.defaultEntries = new Map();
    this.policySpecificEntries = new Map();

    const decodedVersion = {
      schemaVersion: version?.schemaVersion ?? 'v1',
      semanticVersion: version?.semanticVersion ?? '1.0.0',
      soVersion: version?.soVersion,
    };

    const [validated, errors] = validate(decodedVersion, manifestVersion);
    if (errors != null || validated === null) {
      throw new Error(errors ?? 'Invalid version format.');
    }

    this.version = validated;
  }

  public static getDefault(schemaVersion?: ManifestSchemaVersion) {
    return new Manifest({ schemaVersion, semanticVersion: '1.0.0' });
  }

  public bumpSemanticVersion() {
    const newSemanticVersion = semver.inc(this.getSemanticVersion(), 'patch');
    if (!semanticVersion.is(newSemanticVersion)) {
      throw new Error(`Invalid semver: ${newSemanticVersion}`);
    }
    this.version.semanticVersion = newSemanticVersion;
  }

  public getSchemaVersion(): ManifestSchemaVersion {
    return this.version.schemaVersion;
  }

  public getSavedObjectVersion(): string | undefined {
    return this.version.soVersion;
  }

  public getSemanticVersion(): SemanticVersion {
    return this.version.semanticVersion;
  }

  public addEntry(artifact: InternalArtifactSchema, policyId?: string) {
    const existingDescriptor = this.allEntries.get(getArtifactId(artifact));
    const descriptor = {
      isDefaultEntry: existingDescriptor?.isDefaultEntry || policyId === undefined,
      specificTargetPolicies: addValueToSet(existingDescriptor?.specificTargetPolicies, policyId),
      entry: existingDescriptor?.entry || new ManifestEntry(artifact),
    };

    this.allEntries.set(descriptor.entry.getDocId(), descriptor);

    if (policyId) {
      const entries = this.policySpecificEntries.get(policyId) || new Map();
      entries.set(descriptor.entry.getDocId(), descriptor.entry);

      this.policySpecificEntries.set(policyId, entries);
    } else {
      this.defaultEntries.set(descriptor.entry.getDocId(), descriptor.entry);
    }
  }

  public getAllArtifacts(): InternalArtifactSchema[] {
    return [...this.allEntries.values()].map((descriptor) => descriptor.entry.getArtifact());
  }

  public getArtifact(artifactId: string): InternalArtifactSchema | undefined {
    return this.allEntries.get(artifactId)?.entry.getArtifact();
  }

  public containsArtifact(artifact: InternalArtifactSchema): boolean {
    return this.allEntries.has(getArtifactId(artifact));
  }

  public isDefaultArtifact(artifact: InternalArtifactSchema): boolean | undefined {
    return this.allEntries.get(getArtifactId(artifact))?.isDefaultEntry;
  }

  public getArtifactTargetPolicies(artifact: InternalArtifactSchema): Set<string> | undefined {
    return this.allEntries.get(getArtifactId(artifact))?.specificTargetPolicies;
  }

  /**
   * Replaces an artifact from all the collections.
   *
   * @param artifact An InternalArtifactCompleteSchema representing the artifact.
   */
  public replaceArtifact(artifact: InternalArtifactCompleteSchema) {
    const existingEntry = this.allEntries.get(getArtifactId(artifact));
    if (existingEntry) {
      existingEntry.entry = new ManifestEntry(artifact);

      this.allEntries.set(getArtifactId(artifact), existingEntry);
      this.defaultEntries.set(getArtifactId(artifact), existingEntry.entry);

      existingEntry.specificTargetPolicies.forEach((policyId) => {
        const entries = this.policySpecificEntries.get(policyId) || new Map();
        entries.set(existingEntry.entry.getDocId(), existingEntry.entry);
        this.policySpecificEntries.set(policyId, entries);
      });
    }
  }

  public diff(manifest: Manifest): ManifestDiff {
    const diff: ManifestDiff = {
      additions: [],
      removals: [],
      transitions: [],
    };

    for (const artifact of manifest.getAllArtifacts()) {
      if (!this.containsArtifact(artifact)) {
        diff.removals.push(artifact);
      } else if (
        this.isDefaultArtifact(artifact) !== manifest.isDefaultArtifact(artifact) ||
        !isEqual(
          this.getArtifactTargetPolicies(artifact),
          manifest.getArtifactTargetPolicies(artifact)
        )
      ) {
        diff.transitions.push(artifact);
      }
    }

    for (const artifact of this.getAllArtifacts()) {
      if (!manifest.containsArtifact(artifact)) {
        diff.additions.push(artifact);
      }
    }

    return diff;
  }

  public toPackagePolicyManifest(policyId?: string): ManifestSchema {
    const entries = (!!policyId && this.policySpecificEntries.get(policyId)) || this.defaultEntries;
    const manifestObj: ManifestSchema = {
      manifest_version: this.getSemanticVersion(),
      schema_version: this.getSchemaVersion(),
      artifacts: {},
    };

    for (const entry of entries.values()) {
      manifestObj.artifacts[entry.getIdentifier()] = entry.getRecord();
    }

    const [validated, errors] = validate(manifestObj, manifestSchema);
    if (errors != null) {
      throw new Error(errors);
    }

    return validated as ManifestSchema;
  }

  public toSavedObject(): InternalManifestSchema {
    return {
      artifacts: [
        ...createInternalManifestEntries([...this.defaultEntries.keys()]),
        ...flatMap([...this.policySpecificEntries.keys()], (policyId) =>
          createInternalManifestEntries(
            [...(this.policySpecificEntries.get(policyId)?.keys() || [])],
            policyId
          )
        ),
      ],
      schemaVersion: this.getSchemaVersion(),
      semanticVersion: this.getSemanticVersion(),
    };
  }
}
