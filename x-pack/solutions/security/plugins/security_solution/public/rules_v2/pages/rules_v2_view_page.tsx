/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { useHistory, useParams } from 'react-router-dom';
import { useKibana } from '../../common/lib/kibana';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { RULES_V2_PATH } from '../../../common/constants';
import * as i18n from '../translations';

export const RulesV2ViewPage = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { http } = useKibana().services;

  const { data: rule, isLoading, isError, error } = useQuery(
    ['rulesV2View', id],
    () => http.get<RuleResponse>(`${ALERTING_V2_RULE_API_PATH}/${id}`)
  );

  if (isLoading) {
    return (
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
    );
  }

  if (isError || !rule) {
    return (
      <SecuritySolutionPageWrapper>
        <EuiCallOut title={i18n.RULE_LOAD_ERROR} color="danger" iconType="error">
          {error instanceof Error ? error.message : String(error)}
        </EuiCallOut>
      </SecuritySolutionPageWrapper>
    );
  }

  const descriptionItems = [
    ...(rule.metadata.description
      ? [{ title: i18n.VIEW_DESCRIPTION_LABEL, description: rule.metadata.description }]
      : []),
    {
      title: 'Kind',
      description: (
        <EuiBadge color={rule.kind === 'alert' ? 'primary' : 'hollow'}>{rule.kind}</EuiBadge>
      ),
    },
    {
      title: 'Status',
      description: rule.enabled ? (
        <EuiHealth color="success">Enabled</EuiHealth>
      ) : (
        <EuiHealth color="subdued">Disabled</EuiHealth>
      ),
    },
    {
      title: i18n.VIEW_TIME_FIELD_LABEL,
      description: rule.time_field,
    },
    {
      title: i18n.VIEW_SCHEDULE_LABEL,
      description: `Every ${rule.schedule.every}${rule.schedule.lookback ? `, lookback ${rule.schedule.lookback}` : ''}`,
    },
    ...(rule.grouping?.fields?.length
      ? [
          {
            title: i18n.VIEW_GROUPING_LABEL,
            description: (
              <EuiFlexGroup gutterSize="xs" wrap>
                {rule.grouping.fields.map((field) => (
                  <EuiFlexItem grow={false} key={field}>
                    <EuiBadge color="hollow">{field}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ),
          },
        ]
      : []),
    ...(rule.metadata.tags?.length
      ? [
          {
            title: 'Tags',
            description: (
              <EuiFlexGroup gutterSize="xs" wrap>
                {rule.metadata.tags.map((tag) => (
                  <EuiFlexItem grow={false} key={tag}>
                    <EuiBadge color="hollow">{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ),
          },
        ]
      : []),
  ];

  return (
    <SecuritySolutionPageWrapper>
      <EuiButtonEmpty
        iconType="arrowLeft"
        onClick={() => history.push(RULES_V2_PATH)}
        flush="left"
        size="s"
      >
        {i18n.BACK_TO_RULES}
      </EuiButtonEmpty>

      <EuiSpacer size="m" />

      <EuiPageHeader
        pageTitle={rule.metadata.name}
        rightSideItems={[
          <EuiButton
            key="edit-rule"
            fill
            onClick={() => history.push(`/rules_v2/edit/${id}`)}
            data-test-subj="rulesV2EditRuleButton"
          >
            {i18n.EDIT_RULE}
          </EuiButton>,
        ]}
      />

      <EuiSpacer size="l" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel paddingSize="l">
            <EuiTitle size="xs">
              <h3>{i18n.VIEW_RULE}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiDescriptionList listItems={descriptionItems} type="column" />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="l">
            <EuiTitle size="xs">
              <h3>{i18n.VIEW_QUERY_LABEL}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiCodeBlock language="esql" fontSize="m" paddingSize="m" isCopyable>
              {rule.evaluation.query.base}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SecuritySolutionPageWrapper>
  );
};
