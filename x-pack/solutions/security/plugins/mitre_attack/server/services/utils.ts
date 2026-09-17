/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import type {
  MitreEntity,
  MitreEntityCollection,
  MitreFramework,
  MitreEntityType,
  MitreEntityStatus,
} from '@kbn/security-mitre-attack-common';
import { MITRE_ATTACK_ENTITY_SO_TYPE } from '../saved_objects';

export const getEmptyMitreEntityCollection = (
  framework: MitreFramework
): MitreEntityCollection => ({
  framework,
  tactics: [],
  techniques: [],
  subtechniques: [],
});

/** Builds the deterministic saved-object ID for a MITRE entity. */
export const buildSoId = ({
  framework,
  frameworkVersion,
  id,
}: {
  framework: MitreFramework;
  frameworkVersion: string;
  id: string;
}): string => `${framework}:${frameworkVersion}:${id}`;

/**
 * Builds the KQL filter string for the MITRE SO list() method
 */
export const buildKqlFilter = ({
  framework,
  frameworkVersion,
  types,
  status,
}: {
  framework: MitreFramework;
  frameworkVersion?: string;
  types?: MitreEntityType[];
  status?: MitreEntityStatus;
}): string => {
  const parts: string[] = [
    `${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.framework: "${escapeKuery(framework)}"`,
  ];

  if (frameworkVersion) {
    parts.push(
      `${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.framework_version: "${escapeKuery(
        frameworkVersion
      )}"`
    );
  }

  if (types && types.length > 0) {
    const typeList = types.map((entityType) => `"${escapeKuery(entityType)}"`).join(' OR ');
    parts.push(`${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.type: (${typeList})`);
  }

  if (status === 'active') {
    parts.push(`${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.revoked: false`);
    parts.push(`${MITRE_ATTACK_ENTITY_SO_TYPE}.attributes.deprecated: false`);
  }

  return parts.join(' AND ');
};

/** Formats a per-framework/version entity count for the population log line, e.g. "enterprise@19.1: 873". */
export const summarizeEntityCounts = (entities: MitreEntity[]): string => {
  const versionSummary = entities.reduce<Record<string, number>>((acc, entity) => {
    const key = `${entity.framework}@${entity.framework_version}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(versionSummary)
    .map(([key, count]) => `${key}: ${count}`)
    .join(', ');
};
