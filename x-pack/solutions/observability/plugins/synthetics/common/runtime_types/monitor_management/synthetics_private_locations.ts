/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from '../schema_output';
import {
  PrivateLocationCodec,
  SyntheticsPrivateLocationsType,
} from '../zod/synthetics_private_locations';

export { PrivateLocationCodec, SyntheticsPrivateLocationsType };

export type PrivateLocation = SchemaOutput<typeof PrivateLocationCodec>;
export type SyntheticsPrivateLocations = SchemaOutput<typeof SyntheticsPrivateLocationsType>;
