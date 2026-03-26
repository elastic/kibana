/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConvertSchemaType } from '@kbn/rule-registry-plugin/common/schemas/schema';
import type { ALERT_UUID } from '@kbn/rule-data-utils';
import type {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_GROUP_ID,
  ALERT_GROUP_INDEX,
} from '../../../../field_maps/field_names';
import type { DetectionAlertLatest } from './schema';

type Version800 = '8.0.0';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EqlBuildingBlockAlertFields = {
  [ALERT_GROUP_ID]: {
    type: string;
    version: Version800;
  };
  [ALERT_GROUP_INDEX]: {
    type: number;
    version: Version800;
  };
  [ALERT_BUILDING_BLOCK_TYPE]: {
    type: 'default';
    version: Version800;
  };
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type EqlShellAlertFields = {
  [ALERT_GROUP_ID]: {
    type: string;
    version: Version800;
  };
  [ALERT_UUID]: {
    type: string;
    version: Version800;
  };
};

export type EqlBuildingBlockAlertLatest = ConvertSchemaType<string, EqlBuildingBlockAlertFields> &
  DetectionAlertLatest;
export type EqlShellAlertLatest = ConvertSchemaType<string, EqlShellAlertFields> &
  DetectionAlertLatest;
