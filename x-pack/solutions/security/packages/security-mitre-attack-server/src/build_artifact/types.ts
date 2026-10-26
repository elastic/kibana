/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal projections of the STIX 2.1 types consumed by the artifact build.
 * Fields we do not read are omitted.
 *
 * References:
 *   - STIX 2.1 specification: https://docs.oasis-open.org/cti/stix/v2.1/os/stix-v2.1-os.html
 *   - MITRE extensions (x-mitre-* types and x_mitre_* properties):
 *     https://github.com/mitre/cti/blob/master/USAGE.md
 */

/**
 * Identifies which MITRE framework a STIX object belongs to. Appears as
 * `external_references[].source_name` and `kill_chain_phases[].kill_chain_name`.
 * ATLAS bundles may also carry 'mitre-attack' references on techniques that map
 * to ATT&CK; those are secondary and must not be used to resolve ATLAS IDs.
 */
export type StixSourceName = 'mitre-attack' | 'mitre-atlas';

/** A STIX bundle: the top-level container holding every entity in a MITRE release. */
export interface StixBundle {
  readonly objects: StixEntity[];
}

export interface StixEntity {
  /** Unique STIX identifier, e.g. 'attack-pattern--0042a9f5-f053-4769-b3ef-9ad018dfa298' */
  readonly id: string;
  /** STIX type, e.g. 'attack-pattern', 'x-mitre-tactic', 'x-mitre-matrix', 'relationship' */
  readonly type: string;
  /** Display name, e.g. 'OS Credential Dumping' */
  readonly name?: string;
  /** Markdown description, e.g. 'Adversaries may attempt to dump credentials...' */
  readonly description?: string;
  /** External links; the entry whose source_name matches the framework carries its MITRE ID and URL */
  readonly external_references?: StixExternalReference[];
  /** True when MITRE revoked this entity in favor of a successor */
  readonly revoked?: boolean;
  /** True when MITRE deprecated this entity without a replacement */
  readonly x_mitre_deprecated?: boolean;
  /** True only on subtechnique attack-patterns */
  readonly x_mitre_is_subtechnique?: boolean;
  /** Kebab-case tactic shortname, e.g. 'credential-access' (only on x-mitre-tactic) */
  readonly x_mitre_shortname?: string;
  /** Links a technique to its tactics, one entry per tactic */
  readonly kill_chain_phases?: StixKillChainPhase[];
  /** Tactic STIX IDs in matrix column order (only on x-mitre-matrix) */
  readonly tactic_refs?: string[];
  /** Relationship kind, e.g. 'subtechnique-of', 'revoked-by' (only on relationship entities) */
  readonly relationship_type?: string;
  /** STIX ID of the relationship source (the revoked or child entity) */
  readonly source_ref?: string;
  /** STIX ID of the relationship target (the successor or parent entity) */
  readonly target_ref?: string;
}

export interface StixExternalReference {
  /** Source of the reference; 'mitre-attack' (ATT&CK) or 'mitre-atlas' (ATLAS) marks the canonical MITRE entry */
  readonly source_name: string;
  /** MITRE identifier, e.g. 'T1003', 'TA0006', 'T1003.001' (ATT&CK) or 'AML.T0024.002' (ATLAS) */
  readonly external_id?: string;
  /** MITRE URL, e.g. 'https://attack.mitre.org/techniques/T1003/' or 'https://atlas.mitre.org/techniques/AML.T0024' */
  readonly url?: string;
}

export interface StixKillChainPhase {
  /** 'mitre-attack' for ATT&CK, 'mitre-atlas' for ATLAS */
  readonly kill_chain_name: string;
  /** Tactic shortname, e.g. 'credential-access'; matches a tactic's x_mitre_shortname */
  readonly phase_name: string;
}
