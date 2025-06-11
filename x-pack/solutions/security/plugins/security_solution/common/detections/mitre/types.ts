/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MitreTactic {
  id: string;
  name: string;
  reference: string; // A link to the tactic's page
  value: string; // A camelCased version of the name we use to reference the tactic
  label: string; // An i18n internationalized version of the name we use for rendering
}

export interface MitreTechnique extends MitreTactic {
  tactics: string[]; // Tactics this technique assigned to (lowercase dash separated)
}

export interface MitreSubTechnique extends MitreTechnique {
  techniqueId: string; // A technique id this subtechnique assigned to
}
