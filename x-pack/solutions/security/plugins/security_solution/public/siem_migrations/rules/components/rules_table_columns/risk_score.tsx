/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { type RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';
import { COLUMN_EMPTY_VALUE, type TableColumn } from './constants';

export const createRiskScoreColumn = (): TableColumn => {
  return {
    field: 'elastic_rule.risk_score',
    name: i18n.COLUMN_RISK_SCORE,
    render: (riskScore, rule: RuleMigrationRule) => (
      <EuiText data-test-subj="riskScore" size="s">
        {rule.status === SiemMigrationStatus.FAILED ? COLUMN_EMPTY_VALUE : riskScore}
      </EuiText>
    ),
    sortable: true,
    truncateText: true,
    width: '10%',
  };
};
