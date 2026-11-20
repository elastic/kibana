/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { isArray } from 'lodash/fp';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiTitle,
} from '@elastic/eui';
import type { GroupPanelRenderer } from '@kbn/grouping/src';
import { firstNonNullValue } from '@kbn/grouping/src';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AlertsByGroupingAgg, BucketItem } from '../types';
import { ungrouped } from './constants';

export const RULE_NAME_GROUP_TEST_ID = 'rule-name-group-renderer';
export const RULE_NAME_GROUP_TAGS_TEST_ID = 'rule-name-group-renderer-tags';
export const RULE_NAME_GROUP_TAG_TEST_ID = 'rule-name-group-renderer-tag';

const panelWrapperCss = {
  display: 'table',
  tableLayout: 'fixed' as const,
  width: '100%',
};

const tagsPopoverListCss = {
  maxHeight: 200,
  maxWidth: 600,
  overflow: 'auto',
};

const tagsPopoverTitle = i18n.translate('xpack.observability.alert.grouping.tags.popoverTitle', {
  defaultMessage: 'Tags',
});

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

const RuleTagsCountBadge = ({ tags }: { tags: string[] }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const tagCount = tags.length.toString();

  const onBadgeClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsPopoverOpen((isOpen) => !isOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  return (
    <EuiPopover
      ownFocus
      aria-label={tagsPopoverTitle}
      button={
        <EuiBadge
          iconType="tag"
          color="hollow"
          data-test-subj={`${RULE_NAME_GROUP_TAGS_TEST_ID}DisplayPopoverButton`}
          onClick={onBadgeClick}
          onClickAriaLabel={i18n.translate(
            'xpack.observability.alert.grouping.tags.badgeAriaLabel',
            {
              defaultMessage: 'Show {count, plural, one {# tag} other {# tags}}',
              values: { count: tags.length },
            }
          )}
        >
          {tagCount}
        </EuiBadge>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      repositionOnScroll
    >
      <EuiBadgeGroup css={tagsPopoverListCss}>
        {tags.map((tag, index) => (
          <EuiBadge
            color="hollow"
            key={`${tag}-${index}`}
            data-test-subj={RULE_NAME_GROUP_TAG_TEST_ID}
          >
            {tag}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    </EuiPopover>
  );
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
        gutterSize="s"
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
            <RuleTagsCountBadge tags={tags} />
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
