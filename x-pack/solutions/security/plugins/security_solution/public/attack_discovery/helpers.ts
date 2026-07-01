/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getTacticLabel,
  getTacticMetadata,
  replaceNewlineLiterals,
} from '@kbn/elastic-assistant-common';
import type { Replacements } from '@kbn/elastic-assistant-common';

export const getOriginalAlertIds = (alertIds: string[], replacements?: Replacements): string[] => {
  return alertIds.map((id) => replacements?.[id] ?? id);
};
