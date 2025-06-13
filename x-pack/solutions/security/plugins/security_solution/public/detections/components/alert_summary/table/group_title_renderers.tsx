/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiTitle } from '@elastic/eui';
import { isArray } from 'lodash/fp';
import React, { memo } from 'react';
import type { GroupPanelRenderer } from '@kbn/grouping/src';
import { IntegrationIcon } from '../common/integration_icon';
import { useTableSectionContext } from './table_section_context';
import { useGetIntegrationFromRuleId } from '../../../hooks/alert_summary/use_get_integration_from_rule_id';
import { GroupWithIconContent, RuleNameGroupContent } from '../../alerts_table/grouping_settings';
import type { AlertsGroupingAggregation } from '../../alerts_table/grouping_settings/types';
import { firstNonNullValue } from '../../../../../common/endpoint/models/ecs_safety_helpers';

/**
 * Returns renderers to be used in the `buttonContent` property of the EuiAccordion component used within the kbn-grouping package.
 * It handles custom renders for the following fields:
 * - signal.rule.id
 * - kibana.alert.rule.name
 * - host.name
 * - user.name
 * - source.ip
 * For all the other fields the default renderer managed within the kbn-grouping package will be used.
 *
 * These go hand in hand with groupingOptions, groupStatsRenderer and groupStatsAggregations.
 */
export const groupTitleRenderers: GroupPanelRenderer<AlertsGroupingAggregation> = (
  selectedGroup,
  bucket,
  nullGroupMessage
) => {
  switch (selectedGroup) {
    case 'signal.rule.id':
      return <IntegrationNameGroupContent title={bucket.key} />;
    case 'kibana.alert.rule.name':
      return isArray(bucket.key) ? (
        <RuleNameGroupContent
          ruleName={bucket.key[0]}
          ruleDescription={
            firstNonNullValue(firstNonNullValue(bucket.description?.buckets)?.key) ?? ''
          }
          tags={bucket.ruleTags?.buckets}
        />
      ) : undefined;
    case 'host.name':
      return (
        <GroupWithIconContent
          title={bucket.key}
          icon="storage"
          nullGroupMessage={nullGroupMessage}
          dataTestSubj="host-name"
        />
      );
    case 'user.name':
      return (
        <GroupWithIconContent
          title={bucket.key}
          icon="user"
          nullGroupMessage={nullGroupMessage}
          dataTestSubj="user-name"
        />
      );
    case 'source.ip':
      return (
        <GroupWithIconContent
          title={bucket.key}
          icon="globe"
          nullGroupMessage={nullGroupMessage}
          dataTestSubj="source-ip"
        />
      );
  }
};

export const INTEGRATION_GROUP_RENDERER_LOADING_TEST_ID = 'integration-group-renderer-loading';
export const INTEGRATION_GROUP_RENDERER_TEST_ID = 'integration-group-renderer';
export const INTEGRATION_GROUP_RENDERER_INTEGRATION_NAME_TEST_ID =
  'integration-group-renderer-integration-name';
export const INTEGRATION_GROUP_RENDERER_INTEGRATION_ICON_TEST_ID = 'integration-group-renderer';
export const SIGNAL_RULE_ID_GROUP_RENDERER_TEST_ID = 'signal-rule-id-group-renderer';

/**
 * Renders an icon and name of an integration.
 * This component needs to be used within the TableSectionContext which provides the installed packages as well as all the rules.
 */
export const IntegrationNameGroupContent = memo<{
  title: string | string[];
}>(({ title }) => {
  const { packages, ruleResponse } = useTableSectionContext();
  const { integration } = useGetIntegrationFromRuleId({
    packages,
    ruleId: title,
    rules: ruleResponse.rules,
  });

  return (
    <EuiSkeletonText
      data-test-subj={INTEGRATION_GROUP_RENDERER_LOADING_TEST_ID}
      isLoading={ruleResponse.isLoading}
      lines={1}
    >
      {integration ? (
        <EuiFlexGroup
          data-test-subj={INTEGRATION_GROUP_RENDERER_TEST_ID}
          gutterSize="s"
          alignItems="center"
        >
          <EuiFlexItem grow={false}>
            <IntegrationIcon
              data-test-subj={INTEGRATION_GROUP_RENDERER_INTEGRATION_ICON_TEST_ID}
              iconSize="xl"
              integration={integration}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle
              data-test-subj={INTEGRATION_GROUP_RENDERER_INTEGRATION_NAME_TEST_ID}
              size="xs"
            >
              <h5>{integration.title}</h5>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiTitle data-test-subj={SIGNAL_RULE_ID_GROUP_RENDERER_TEST_ID} size="xs">
          <h5>{title}</h5>
        </EuiTitle>
      )}
    </EuiSkeletonText>
  );
});
IntegrationNameGroupContent.displayName = 'IntegrationNameGroup';
