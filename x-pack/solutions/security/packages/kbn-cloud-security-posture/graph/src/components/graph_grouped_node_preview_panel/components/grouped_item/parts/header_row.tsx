/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ALERT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { GROUPED_ITEM_TITLE_TEST_ID } from '../../../test_ids';
import type { EntityOrEventItem } from '../types';
import { emitGroupedItemClick } from '../../../events';
import { displayEntityName, displayEventName } from '../utils';

export interface HeaderRowProps {
  item: EntityOrEventItem;
}

export const HeaderRow = ({ item }: HeaderRowProps) => {
  const { euiTheme } = useEuiTheme();

  const title = useMemo(() => {
    switch (item.itemType) {
      case DOCUMENT_TYPE_EVENT:
      case DOCUMENT_TYPE_ALERT:
        return displayEventName(item);
      case DOCUMENT_TYPE_ENTITY:
        return displayEntityName(item);
    }
  }, [item]);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {item.itemType === DOCUMENT_TYPE_ALERT && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="warningFilled" size="m" color="danger" />
        </EuiFlexItem>
      )}
      {item.itemType === DOCUMENT_TYPE_ENTITY && item.icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={item.icon}
            size="m"
            color="primary"
            css={css`
              /* Icon is 1px mis-aligned vs link (entity name) */
              position: relative;
              top: 1px;
            `}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
      >
        <EuiLink
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            emitGroupedItemClick(item);
          }}
          color="primary"
          css={css`
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: ${euiTheme.font.weight.semiBold};
            width: 100%;
          `}
          data-test-subj={GROUPED_ITEM_TITLE_TEST_ID}
        >
          {title}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
