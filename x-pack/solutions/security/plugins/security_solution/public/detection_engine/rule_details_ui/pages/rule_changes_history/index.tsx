/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { HeaderPage } from '../../../../common/components/header_page';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useRuleWithFallback } from '../../../rule_management/logic/use_rule_with_fallback';
import { RuleDetailTabs } from '../rule_details/use_rule_details_tabs';
import { CreatedBy, UpdatedBy } from '../../../../detections/components/rules/rule_info';
import { RuleStatus, ruleStatusI18n } from '../../../common/components/rule_execution_status';
import { RuleChangesHistory } from '../../components/changes_history';

export const RuleChangesHistoryPage = memo(function RuleChangesHistoryPage(): JSX.Element {
  const { detailName: ruleId } = useParams<{ detailName: string }>();
  const { rule } = useRuleWithFallback(ruleId);
  const { euiTheme } = useEuiTheme();
  const header = useMemo(() => {
    const subTitle = rule
      ? [
          <CreatedBy createdBy={rule.created_by} createdAt={rule.created_at} />,
          rule.updated_by != null ? (
            <UpdatedBy updatedBy={rule.updated_by} updatedAt={rule.updated_at} />
          ) : (
            ''
          ),
        ].filter(Boolean)
      : [];

    const lastExecution = rule?.execution_summary?.last_execution;
    const lastExecutionStatus = lastExecution?.status;
    const lastExecutionDate = lastExecution?.date ?? '';
    const statusInfo = (
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          {ruleStatusI18n.STATUS}
          {':'}
        </EuiFlexItem>
        <RuleStatus status={lastExecutionStatus} date={lastExecutionDate}>
          {null}
        </RuleStatus>
      </EuiFlexGroup>
    );

    return (
      <HeaderPage
        title={rule?.name ?? ''}
        subtitle={subTitle}
        subtitle2={statusInfo}
        backOptions={{
          pageId: SecurityPageName.rules,
          path: getRuleDetailsTabUrl(ruleId, RuleDetailTabs.overview),
          dataTestSubj: 'ruleChangesHistoryBack',
        }}
        backInlined
      />
    );
  }, [ruleId, rule]);

  return (
    <>
      <SecuritySolutionPageWrapper
        style={{
          height: `calc(var(--kbn-application--content-height) - ${euiTheme.size.l} - ${euiTheme.size.l})`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <RuleChangesHistory header={header} />
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.rulesChangesHistory} state={{ ruleName: rule?.name }} />
    </>
  );
});
