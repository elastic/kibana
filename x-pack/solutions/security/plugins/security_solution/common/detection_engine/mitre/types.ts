/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MitreSubTechnique as SlimMitreSubTechnique,
  MitreTactic as SlimMitreTactic,
  MitreTechnique as SlimMitreTechnique,
} from '@kbn/securitysolution-mitre-catalog';

/**
 * The catalog's structural shape (id, name, reference, value, tactics, …)
 * lives in `@kbn/securitysolution-mitre-catalog`, where it is shared with
 * other Kibana security-domain consumers (e.g. the threat-intelligence
 * skill) without forcing them to depend on `@kbn/security-solution-plugin`.
 *
 * The Security Solution adds an `i18n` `label` field on top, used by the
 * detection-rule UI and other in-app rendering. The shapes below extend the
 * slim package types with that field — keeping the data definition single-
 * sourced while preserving the existing labeled API consumed across the plugin.
 */
export interface MitreTactic extends SlimMitreTactic {
  /** An i18n internationalized version of the name we use for rendering. */
  label: string;
}

export interface MitreTechnique extends SlimMitreTechnique {
  /** An i18n internationalized version of the name we use for rendering. */
  label: string;
}

export interface MitreSubTechnique extends SlimMitreSubTechnique {
  /** An i18n internationalized version of the name we use for rendering. */
  label: string;
}
