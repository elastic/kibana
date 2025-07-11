/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXPAND_UNCHANGED_LINES = (linesCount: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.upgradeRules.expandHiddenDiffLinesLabel',
    {
      values: { linesCount },
      defaultMessage:
        'Expand {linesCount} unchanged {linesCount, plural, one {line} other {lines}}',
    }
  );
