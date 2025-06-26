/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';

export const getPatternResultTooltip = (incompatible: number | undefined): string => {
  if (incompatible == null) {
    return i18n.SOME_UNCHECKED;
  } else if (incompatible === 0) {
    return i18n.ALL_PASSED;
  } else {
    return i18n.SOME_FAILED;
  }
};
