/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValid } from 'ipaddr.js';
import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

/**
 * validates ES ip type
 */
export const isValidIpType = (ip: SearchTypes): boolean => {
  if (typeof ip !== 'string') {
    return false;
  }

  return isValid(ip);
};
