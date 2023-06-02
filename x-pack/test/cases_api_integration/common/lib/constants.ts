/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '@kbn/cases-plugin/common/constants';
import { constructFileKindIdByOwner } from '@kbn/cases-plugin/common/files';

export const SECURITY_SOLUTION_FILE_KIND = constructFileKindIdByOwner(SECURITY_SOLUTION_OWNER);
export const OBSERVABILITY_FILE_KIND = constructFileKindIdByOwner(OBSERVABILITY_OWNER);
export const CASES_FILE_KIND = constructFileKindIdByOwner(GENERAL_CASES_OWNER);
