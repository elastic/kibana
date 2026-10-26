/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { isArray } from 'lodash/fp';
import React, { memo } from 'react';
import type { GroupPanelRenderer } from '@kbn/grouping/src';
import { RELATED_INTEGRATION } from '../../../constants';
import { IntegrationIcon } from '../common/integration_icon';
import { useTableSectionContext } from './table_section_context';
import { GroupWithIconContent, RuleNameGroupContent } from '../../alerts_table/grouping_settings';
import type { AlertsGroupingAggregation } from '../../alerts_table/grouping_settings/types';
import { firstNonNullValue } from '../../../../../common/endpoint/models/ecs_safety_helpers';

/**
 * Returns renderers to be used in the `buttonContent` property of the EuiAccordion component used within the kbn-grouping package.
 * It handles custom renders for the following fields:
 * - relatedIntegration (a runTime field we're creating and using in the adhoc dataView)
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
    case RELATED_INTEGRATION:
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

export const INTEGRATION_GROUP_RENDERER_TEST_ID = 'integration-group-renderer';
export const INTEGRATION_GROUP_RENDERER_INTEGRATION_NAME_TEST_ID =
  'integration-group-renderer-integration-name';
export const INTEGRATION_GROUP_RENDERER_INTEGRATION_ICON_TEST_ID = 'integration-group-renderer';
export const RELATED_INTEGRATION_GROUP_RENDERER_TEST_ID = 'related-integration-group-renderer';

/**
 * Renders an icon and name of an integration.
 * This component needs to be used within the TableSectionContext which provides the installed packages.
 */
export const IntegrationNameGroupContent = memo<{
  title: string | string[];
}>(({ title }) => {
  const { packages } = useTableSectionContext();
  const integrationName = Array.isArray(title) ? title[0] : title;
  const integration = packages.find((p) => integrationName === p.name);

  return (
    <>
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
        <EuiTitle data-test-subj={RELATED_INTEGRATION_GROUP_RENDERER_TEST_ID} size="xs">
          <h5>{integrationName}</h5>
        </EuiTitle>
      )}
    </>
  );
});
IntegrationNameGroupContent.displayName = 'IntegrationNameGroup';
