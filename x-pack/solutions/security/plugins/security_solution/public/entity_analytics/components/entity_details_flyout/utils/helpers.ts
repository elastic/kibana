/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';

export const getAnonymizedEntityIdentifier = (identifier: string, replacements: Replacements) => {
  const [anonymizedEntityIdentifier] =
    Object.entries(replacements).find(([_, value]) => value === identifier) ?? [];
  return anonymizedEntityIdentifier;
};
