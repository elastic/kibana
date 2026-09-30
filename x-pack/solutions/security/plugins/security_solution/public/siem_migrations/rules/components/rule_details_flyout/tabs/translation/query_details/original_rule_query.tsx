/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import xmlFormatter from 'xml-formatter';
import type { RuleMigrationRule } from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { useRuleMigrationVendorCopy } from '../../../../../hooks/use_rule_migration_vendor_copy';
import { QueryHeader } from './header';
import { QueryViewer } from './query_viewer';

interface OriginalRuleQueryProps {
  migrationRule: RuleMigrationRule;
}

export const OriginalRuleQuery: React.FC<OriginalRuleQueryProps> = React.memo(
  ({ migrationRule }) => {
    const { originalRule } = useRuleMigrationVendorCopy(migrationRule.original_rule.vendor);

    return (
      <>
        <QueryHeader title={originalRule.title} tooltip={originalRule.tooltip} />
        <EuiHorizontalRule data-test-subj="queryHorizontalRule" margin="xs" />
        <QueryViewer
          ruleName={migrationRule.original_rule.title}
          query={
            migrationRule.original_rule.query_language === 'xml'
              ? xmlFormatter(migrationRule.original_rule.query)
              : migrationRule.original_rule.query
          }
          language={migrationRule.original_rule.query_language}
        />
      </>
    );
  }
);
OriginalRuleQuery.displayName = 'OriginalRuleQuery';
