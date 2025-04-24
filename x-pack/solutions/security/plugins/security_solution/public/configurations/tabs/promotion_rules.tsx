/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { RulesTableContextProvider } from '../../detection_engine/rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { PromotionRulesTable } from './promotion_rules/promotion_rules_table';

export const PromotionRules: React.FC = () => {
  return (
    <RulesTableContextProvider>
      <SecuritySolutionPageWrapper>
        <EuiSpacer />
        <PromotionRulesTable />
      </SecuritySolutionPageWrapper>
    </RulesTableContextProvider>
  );
};
