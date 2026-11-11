/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { mitreEntitiesSchema } from '@kbn/security-mitre-attack-common';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';

const ARTIFACT_PATH = join(__dirname, '../../artifacts/mitre_artifact.json');

// Module-level cache: parsed and validated once, reused on subsequent calls.
let cached: MitreEntity[] | undefined;

/**
 * Returns the bundled MITRE ATT&CK entities for server-side consumption.
 * Reads and zod-validates artifacts/mitre_artifact.json on first call,
 * then returns the cached result on subsequent calls. The artifact is a flat
 * array of self-describing entities; each entity carries its own framework and
 * framework_version so multiple framework/version sets can coexist in the file.
 *
 * Run node scripts/build_artifact.js from this package's directory to
 * regenerate the artifact file.
 */
export const loadMitreArtifact = (): MitreEntity[] => {
  if (cached !== undefined) {
    return cached;
  }

  if (!existsSync(ARTIFACT_PATH)) {
    throw new Error(
      `MITRE ATT&CK artifact not found at '${ARTIFACT_PATH}'. ` +
        `Run the build script to generate it: ` +
        `node x-pack/solutions/security/packages/security-mitre-attack-server/scripts/build_artifact.js`
    );
  }

  const raw = readFileSync(ARTIFACT_PATH, 'utf-8');
  const parsed = mitreEntitiesSchema.parse(JSON.parse(raw));
  cached = parsed;
  return cached;
};
