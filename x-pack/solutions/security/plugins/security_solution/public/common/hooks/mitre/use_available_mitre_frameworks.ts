/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MITRE_FRAMEWORK, MITRE_FRAMEWORKS } from '@kbn/security-mitre-attack-common';
import type { MitreFramework } from '@kbn/security-mitre-attack-common';
import { useKibana } from '../../lib/kibana';

const LEGACY_FRAMEWORKS: readonly MitreFramework[] = [DEFAULT_MITRE_FRAMEWORK];

/** Frameworks the active MITRE data source can serve; the bundled legacy source is ATT&CK Enterprise only. */
export const useAvailableMitreFrameworks = (): readonly MitreFramework[] => {
  const { services } = useKibana();
  const isManagedSourceEnabled = services.mitreAttack?.isEnabled ?? false;
  return isManagedSourceEnabled ? MITRE_FRAMEWORKS : LEGACY_FRAMEWORKS;
};
