/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { type RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { SeverityBadge } from '../../../../common/components/severity_badge';
import { COLUMN_EMPTY_VALUE, type TableColumn } from './constants';
import * as i18n from './translations';

export const createSeverityColumn = (): TableColumn => {
  return {
    field: 'elastic_rule.severity',
    name: i18n.COLUMN_SEVERITY,
    render: (value: Severity, rule: RuleMigration) =>
      rule.status === SiemMigrationStatus.FAILED ? (
        <>{COLUMN_EMPTY_VALUE}</>
      ) : (
        <SeverityBadge value={value} />
      ),
    sortable: true,
    truncateText: true,
    width: '12%',
  };
};
