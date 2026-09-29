/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import {
  LinkedRemoteLocationCodec,
  OverviewPingCodec,
  OverviewStatusMetaDataCodec,
  OverviewStatusFilterIdCodec,
  OverviewStatusCodec,
  PaginatedOverviewStatusCodec,
  OverviewStalePriorRunCodec,
  OverviewStaleStatusCodec,
} from '../zod/synthetics_overview_status';

export {
  LinkedRemoteLocationCodec,
  OverviewPingCodec,
  OverviewStatusMetaDataCodec,
  OverviewStatusFilterIdCodec,
  OverviewStatusCodec,
  PaginatedOverviewStatusCodec,
  OverviewStalePriorRunCodec,
  OverviewStaleStatusCodec,
};

export type OverviewPing = SchemaOutput<typeof OverviewPingCodec>;
export type OverviewStatusFilterId = SchemaOutput<typeof OverviewStatusFilterIdCodec>;
export type OverviewStatus = SchemaOutput<typeof OverviewStatusCodec>;
export type OverviewStatusState = SchemaOutput<typeof OverviewStatusCodec>;
export type PaginatedOverviewStatus = SchemaOutput<typeof PaginatedOverviewStatusCodec>;
export type OverviewStatusMetaData = SchemaOutput<typeof OverviewStatusMetaDataCodec>;
export type OverviewStalePriorRun = SchemaOutput<typeof OverviewStalePriorRunCodec>;
export type OverviewStaleStatus = SchemaOutput<typeof OverviewStaleStatusCodec>;
