/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';

/**
 * Returns an i18n description of an an ILM phase
 */
export const getIlmPhaseDescription = (phase: string): string => {
  switch (phase) {
    case 'hot':
      return i18n.HOT_DESCRIPTION;
    case 'warm':
      return i18n.WARM_DESCRIPTION;
    case 'cold':
      return i18n.COLD_DESCRIPTION;
    case 'frozen':
      return i18n.FROZEN_DESCRIPTION;
    case 'unmanaged':
      return i18n.UNMANAGED_DESCRIPTION;
    default:
      return ' ';
  }
};
