/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetPrebuiltRuleBaseVersionResponseBody } from '../../../../../common/api/detection_engine';

interface WithBaseVersion extends GetPrebuiltRuleBaseVersionResponseBody {
  hasBaseVersion: true;
}

interface WithoutBaseVersion {
  hasBaseVersion: false;
}

export type PrebuiltRuleBaseVersionDiff = WithBaseVersion | WithoutBaseVersion;
