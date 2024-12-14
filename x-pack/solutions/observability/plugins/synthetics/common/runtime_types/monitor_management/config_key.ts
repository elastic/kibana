/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { tEnum } from '../../utils/t_enum';
import { ConfigKey } from '../../constants/monitor_management';
export { ConfigKey } from '../../constants/monitor_management';

export const ConfigKeyCodec = tEnum<ConfigKey>('ConfigKey', ConfigKey);
export type ConfigKeyType = t.TypeOf<typeof ConfigKeyCodec>;
