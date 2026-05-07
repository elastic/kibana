/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Identifies the MITRE knowledge base a given entity belongs to.
 *
 * The POC artifact only ships `enterprise`. The other values are accepted by the
 * schema so that the data model and hydration code do not need to change when a
 * future PR adds ATLAS, Mobile, or ICS sources.
 */
export type MitreFramework = 'enterprise' | 'mobile' | 'ics' | 'atlas';

/**
 * Discriminator value for the entity kind.
 */
export type MitreEntityType = 'tactic' | 'technique' | 'subtechnique';

interface MitreEntityBase {
  framework: MitreFramework;
  /**
   * Versions of the framework that contain this entity. POC always emits a
   * single-element array (e.g. `['ATT&CK-v18.1']`). The array shape leaves room
   * for a future build script that deduplicates identical entities across
   * versions without breaking the on-disk schema.
   */
  versions: string[];
  /** Public MITRE id, e.g. `TA0006`, `T1078`, `T1078.001`. */
  id: string;
  /** Human-readable display name, e.g. `Credential Access`. */
  name: string;
  /** Canonical URL for the entity on attack.mitre.org or atlas.mitre.org. */
  reference: string;
  /** Markdown description sourced verbatim from STIX. */
  description: string;
}

export interface MitreTactic extends MitreEntityBase {
  type: 'tactic';
}

export interface MitreTechnique extends MitreEntityBase {
  type: 'technique';
  /**
   * Tactic shortnames the technique is mapped to via STIX `kill_chain_phases`,
   * e.g. `['credential-access', 'defense-evasion']`.
   */
  tactics: string[];
}

export interface MitreSubtechnique extends MitreEntityBase {
  type: 'subtechnique';
  tactics: string[];
  /** Parent technique id, e.g. `T1078` for `T1078.001`. Kept explicit for ES queryability. */
  techniqueId: string;
}

export type MitreEntity = MitreTactic | MitreTechnique | MitreSubtechnique;

/**
 * Bundled artifact written to `data/mitre_artifact.json` and consumed by the
 * server-side hydration code.
 */
export interface MitreAttackArtifact {
  /**
   * Stamp identifying the artifact contents. Matches the `stamp` written to
   * `data/artifact_version.json`. Used by the server to decide whether the
   * managed index needs to be re-hydrated.
   */
  stamp: string;
  generatedAt: string;
  entities: MitreEntity[];
}

/**
 * Small companion file written next to the artifact that the server reads to
 * compare against the cluster-stored stamp without having to load the full
 * entity list.
 */
export interface MitreAttackArtifactVersion {
  stamp: string;
  generatedAt: string;
}
