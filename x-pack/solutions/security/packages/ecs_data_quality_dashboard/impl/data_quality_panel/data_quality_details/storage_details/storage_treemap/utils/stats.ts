/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternRollup } from '../../../../types';

export const getPatternSizeInBytes = ({
  pattern,
  patternRollups,
}: {
  pattern: string;
  patternRollups: Record<string, PatternRollup>;
}): number | undefined => {
  if (patternRollups[pattern] != null) {
    return patternRollups[pattern].sizeInBytes;
  } else {
    return undefined;
  }
};

export const getPatternDocsCount = ({
  pattern,
  patternRollups,
}: {
  pattern: string;
  patternRollups: Record<string, PatternRollup>;
}): number => {
  if (patternRollups[pattern] != null) {
    return patternRollups[pattern].docsCount ?? 0;
  } else {
    return 0;
  }
};
