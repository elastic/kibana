/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldValidators } from '../../../../../shared_imports';
import * as i18n from './translations';

export const threatIndexPatternsRequiredValidator = fieldValidators.emptyField(
  i18n.THREAT_MATCH_INDEX_FIELD_VALIDATION_REQUIRED_ERROR
);
