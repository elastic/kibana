/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isArray } from 'lodash/fp';
import { EuiFlexGroup, EuiIconTip, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { GroupPanelRenderer } from '@kbn/grouping/src';
import { firstNonNullValue } from '@kbn/grouping/src';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AlertsByGroupingAgg, BucketItem } from '../types';
import { Tags } from '../../tags';
import { ungrouped } from './constants';

export const RULE_NAME_GROUP_TEST_ID = 'rule-name-group-renderer';
export const RULE_NAME_GROUP_TAGS_TEST_ID = 'rule-name-group-renderer-tags';

const panelWrapperCss = {
  display: 'table',
  tableLayout: 'fixed' as const,
  width: '100%',
};

export const renderGroupPanel: GroupPanelRenderer<AlertsByGroupingAgg> = (
  selectedGroup,
  bucket
) => {
  switch (selectedGroup) {
    case 'kibana.alert.rule.name':
      return isArray(bucket.key) ? (
        <RuleNameGroupContent
          ruleName={bucket.key[0]}
          tags={bucket.ruleTags?.buckets.map((tag: BucketItem) => tag.key)}
        />
      ) : undefined;
    case 'kibana.alert.instance.id':
      return <InstanceIdGroupContent instanceId={firstNonNullValue(bucket.key)} />;
  }
};

const RuleNameGroupContent = React.memo<{
  ruleName: string;
  tags?: string[] | undefined;
}>(({ ruleName, tags }) => {
  const hasTags = !!tags && tags.length > 0;

  return (
    <div css={panelWrapperCss}>
      <EuiFlexGroup
        data-test-subj={RULE_NAME_GROUP_TEST_ID}
        gutterSize="m"
        alignItems="center"
        responsive={false}
        wrap={false}
      >
        <EuiFlexItem grow={false} css={{ display: 'contents' }}>
          <EuiTitle size="xs">
            <h5 className="eui-textTruncate">{ruleName}</h5>
          </EuiTitle>
        </EuiFlexItem>
        {hasTags ? (
          <EuiFlexItem grow={false} data-test-subj={RULE_NAME_GROUP_TAGS_TEST_ID}>
            <Tags tags={tags} color="hollow" size={5} oneLine />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
});
RuleNameGroupContent.displayName = 'RuleNameGroup';

const InstanceIdGroupContent = React.memo<{
  instanceId?: string;
}>(({ instanceId }) => {
  const isUngrouped = instanceId === '*';
  return (
    <div css={panelWrapperCss}>
      <EuiFlexGroup data-test-subj={RULE_NAME_GROUP_TEST_ID} gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false} css={{ display: 'contents' }}>
          <EuiTitle size="xs">
            <h5 className="eui-textTruncate">
              {isUngrouped ? ungrouped : instanceId ?? '--'}
              &nbsp;
              {isUngrouped && (
                <EuiIconTip
                  content={
                    <FormattedMessage
                      id="xpack.observability.alert.grouping.ungrouped.info"
                      defaultMessage='There is no "group by" field selected in the rule definition.'
                    />
                  }
                />
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
InstanceIdGroupContent.displayName = 'InstanceIdGroupContent';
