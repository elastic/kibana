/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mitreAttackArtifactSchema, mitreAttackArtifactVersionSchema } from './schema';
import type { MitreAttackArtifact, MitreAttackArtifactVersion } from './types';

import artifactJson from '../data/mitre_artifact.json';
import artifactVersionJson from '../data/artifact_version.json';

let cachedArtifact: MitreAttackArtifact | undefined;
let cachedVersion: MitreAttackArtifactVersion | undefined;

/**
 * Load and validate the bundled artifact. The result is cached after the first
 * call — the file is committed to the repo and never changes at runtime, so a
 * single validation pass per process is enough.
 */
export const loadMitreAttackArtifact = (): MitreAttackArtifact => {
  if (cachedArtifact) {
    return cachedArtifact;
  }
  cachedArtifact = mitreAttackArtifactSchema.parse(artifactJson);
  return cachedArtifact;
};

/**
 * Load just the version stamp without paying the entity-list validation cost.
 * Used by the server-side hydration check on every Kibana boot.
 */
export const loadMitreAttackArtifactVersion = (): MitreAttackArtifactVersion => {
  if (cachedVersion) {
    return cachedVersion;
  }
  cachedVersion = mitreAttackArtifactVersionSchema.parse(artifactVersionJson);
  return cachedVersion;
};
