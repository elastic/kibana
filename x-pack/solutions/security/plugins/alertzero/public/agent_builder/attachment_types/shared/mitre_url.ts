/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public MITRE ATT&CK technique reference URL. There is no importable
 * component that maps a technique id to a name (the lookup table lives in
 * `@kbn/security-solution-plugin/common` and is ~290 KB); technique badges
 * stay id-only with this external link instead.
 */
export const buildMitreTechniqueUrl = (techniqueId: string): string =>
  `https://attack.mitre.org/techniques/${techniqueId.replace('.', '/')}/`;
