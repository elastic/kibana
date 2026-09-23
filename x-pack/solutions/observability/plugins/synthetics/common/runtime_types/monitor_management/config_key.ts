/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SchemaOutput } from '../schema_output';
import { ConfigKey } from '../../constants/monitor_management';

export { ConfigKey };

export const ConfigKeyCodec = z.enum(ConfigKey);
export type ConfigKeyType = SchemaOutput<typeof ConfigKeyCodec>;
