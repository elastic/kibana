/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { GROUPED_LIST_ITEM_TITLE_TEST_ID } from '../../../test_ids';
import type { GroupedListItem } from '../types';

export interface HeaderRowProps {
  item: GroupedListItem;
}

export const HeaderRow = ({ item }: HeaderRowProps) => {
  const { euiTheme } = useEuiTheme();

  const title = useMemo(() => {
    switch (item.type) {
      case 'event':
      case 'alert':
        return item.action || item.id;
      case 'entity':
        return item.tag || item.label || item.id;
    }
  }, [item]);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {item.type === 'alert' && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="warningFilled" size="m" color="danger" />
        </EuiFlexItem>
      )}
      {item.type === 'entity' && item.icon && (
        <EuiFlexItem grow={false}>
          {/* TODO Icon is slightly misaligned vs text (2-3 px above) */}
          <EuiIcon type={item.icon} size="m" color="primary" />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
      >
        {/* truncated title */}
        <EuiToolTip content={title}>
          <EuiLink
            href="#"
            color="primary"
            css={css`
              display: block;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              font-weight: ${euiTheme.font.weight.semiBold};
              width: 100%;
            `}
            data-test-subj={GROUPED_LIST_ITEM_TITLE_TEST_ID}
          >
            {title}
          </EuiLink>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="primary"
          size="s"
          flush="right"
          iconType="boxesHorizontal"
          iconSide="left"
          onClick={() => {}}
        />
        {/* Menu placeholder (3 dots) if needed later */}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
