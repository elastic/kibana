/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import type { RuleMigrationRule } from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { QueryHeader } from './header';
import { QueryViewer } from './query_viewer';
import * as i18n from './translations';

interface OriginalRuleQueryProps {
  migrationRule: RuleMigrationRule;
}

export const OriginalRuleQuery: React.FC<OriginalRuleQueryProps> = React.memo(
  ({ migrationRule }) => {
    return (
      <>
        <QueryHeader title={i18n.SPLUNK_QUERY_TITLE} tooltip={i18n.SPLUNK_QUERY_TOOLTIP} />
        <EuiHorizontalRule margin="xs" />
        <QueryViewer
          ruleName={migrationRule.original_rule.title}
          query={migrationRule.original_rule.query}
          language={migrationRule.original_rule.query_language}
        />
      </>
    );
  }
);
OriginalRuleQuery.displayName = 'OriginalRuleQuery';
