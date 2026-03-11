/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QradarResourceType } from '../../model/vendor/common/qradar.gen';

export interface QradarRule {
  id: string;
  rule_data: string;
  rule_type: string;
  description: string;
  title: string;
}

export interface QradarRuleData {
  rule: {
    name: string;
    notes: string;
    responses: {
      newEvent: string[];
    };
  };
}

export interface ResourceDetailType {
  name: string;
  description: string;
  content: string;
}

export type ResourceTypeMap = Record<QradarResourceType, ResourceDetailType[] | undefined>;
