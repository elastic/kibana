/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { type RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';

interface NameProps {
  rule: RuleMigrationRule;
  openMigrationRuleDetails: (rule: RuleMigrationRule) => void;
}

const Name = ({ rule, openMigrationRuleDetails }: NameProps) => {
  if (rule.status === SiemMigrationStatus.FAILED) {
    return (
      <EuiText data-test-subj="ruleName" color="danger" size="s">
        {rule.original_rule.title}
      </EuiText>
    );
  }
  return (
    <EuiLink
      onClick={() => {
        openMigrationRuleDetails(rule);
      }}
      data-test-subj="ruleName"
    >
      {rule.elastic_rule?.title ?? rule.original_rule.title}
    </EuiLink>
  );
};

export const createNameColumn = ({
  openMigrationRuleDetails,
}: {
  openMigrationRuleDetails: (rule: RuleMigrationRule) => void;
}): TableColumn => {
  return {
    field: 'elastic_rule.title',
    name: i18n.COLUMN_NAME,
    render: (_, rule: RuleMigrationRule) => (
      <Name rule={rule} openMigrationRuleDetails={openMigrationRuleDetails} />
    ),
    sortable: true,
    truncateText: true,
    width: '40%',
    align: 'left',
  };
};
