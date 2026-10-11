/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreFramework } from './schema';

/**
 * The `framework` string written on a rule's `threat` entries for each managed MITRE
 * framework. These literals are part of the rule schema contract shared with the
 * detection-rules repository and must not change.
 */
export const THREAT_FRAMEWORK_NAME: Record<MitreFramework, string> = {
  enterprise: 'MITRE ATT&CK',
  atlas: 'MITRE ATLAS',
};

const MITRE_FRAMEWORK_BY_THREAT_NAME = new Map<string, MitreFramework>(
  (Object.entries(THREAT_FRAMEWORK_NAME) as Array<[MitreFramework, string]>).map(
    ([framework, name]) => [name, framework]
  )
);

/** ATLAS entity ids are prefixed, e.g. `AML.TA0000`, `AML.T0044`, `AML.T0024.002`. */
const ATLAS_ID_PREFIX = 'AML.';

/**
 * Resolves a rule threat entry's `framework` string to a managed MITRE framework, or
 * undefined when the string is not one Kibana recognizes.
 */
export const getMitreFrameworkByThreatName = (
  threatFrameworkName: string | undefined
): MitreFramework | undefined =>
  threatFrameworkName == null ? undefined : MITRE_FRAMEWORK_BY_THREAT_NAME.get(threatFrameworkName);

/**
 * Infers the framework from a MITRE entity id alone. ATLAS ids carry the `AML.` prefix;
 * everything else is treated as ATT&CK Enterprise. Use only where the threat entry's
 * `framework` string is unavailable.
 */
export const getMitreFrameworkById = (id: string): MitreFramework =>
  id.startsWith(ATLAS_ID_PREFIX) ? 'atlas' : 'enterprise';

const MITRE_ATTACK_BASE_URL = 'https://attack.mitre.org';
const MITRE_ATLAS_BASE_URL = 'https://atlas.mitre.org';

const buildAttackReferenceUrl = (id: string): string | undefined => {
  if (id.startsWith('TA')) {
    return `${MITRE_ATTACK_BASE_URL}/tactics/${id}/`;
  }

  if (id.startsWith('T')) {
    const [parent, child] = id.split('.');
    if (child) {
      return `${MITRE_ATTACK_BASE_URL}/techniques/${parent}/${child}/`;
    }
    return `${MITRE_ATTACK_BASE_URL}/techniques/${parent}/`;
  }

  return undefined;
};

const buildAtlasReferenceUrl = (id: string): string | undefined => {
  if (!id.startsWith(ATLAS_ID_PREFIX)) {
    return undefined;
  }

  const localId = id.slice(ATLAS_ID_PREFIX.length);
  if (localId.startsWith('TA')) {
    return `${MITRE_ATLAS_BASE_URL}/tactics/${id}/`;
  }

  if (localId.startsWith('T')) {
    // ATLAS keeps the dotted subtechnique id in the URL: /techniques/AML.T0024.002/
    return `${MITRE_ATLAS_BASE_URL}/techniques/${id}/`;
  }

  return undefined;
};

/**
 * Builds the public MITRE reference URL for a tactic, technique, or subtechnique id.
 * The framework is inferred from the id when not given. Returns undefined for ids that
 * do not match the framework's id format.
 */
export const buildMitreReferenceUrl = (
  id: string,
  framework: MitreFramework = getMitreFrameworkById(id)
): string | undefined => {
  if (!id) {
    return undefined;
  }

  return framework === 'atlas' ? buildAtlasReferenceUrl(id) : buildAttackReferenceUrl(id);
};
