/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { EuiHorizontalRule, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { SeverityBadge } from '../../../../common/components/severity_badge';
import { COLUMN_EMPTY_VALUE, type TableColumn } from './constants';
import * as i18n from './translations';
import { TableHeader } from './header';

export const createSeverityColumn = (): TableColumn => {
  return {
    field: 'elastic_rule.severity',
    name: (
      <TableHeader
        title={i18n.COLUMN_SEVERITY}
        tooltipContent={
          <FormattedMessage
            id="xpack.securitySolution.siemMigrations.rules.tableColumn.severityTooltip"
            defaultMessage="{title} If the severity cannot be inferred from the rule export data, the rule Severity will be set to the default: Low severity."
            values={{
              title: (
                <EuiText size="s">
                  <p>
                    <b>{i18n.COLUMN_SEVERITY}</b>
                    <EuiHorizontalRule margin="s" />
                  </p>
                </EuiText>
              ),
            }}
          />
        }
      />
    ),
    render: (value: Severity, rule: RuleMigrationRule) =>
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
