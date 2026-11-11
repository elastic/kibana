/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationStatus } from '../../../../common/siem_migrations/constants';
import type { MigrationStatus } from '../../../../common/siem_migrations/model/common.gen';

// Tables never open the details flyout for failed items (name renders as plain
// text, actions are hidden), so they are excluded from flyout navigation.
export const isMigrationItemNavigableWithFlyout = (item: { status: MigrationStatus }): boolean =>
  item.status !== SiemMigrationStatus.FAILED;
