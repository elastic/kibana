/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common/types/attack_discovery/routes/public/schedules/schedules.gen';

export type TableColumn = EuiBasicTableColumn<AttackDiscoverySchedule>;
