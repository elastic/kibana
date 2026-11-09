/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiToolTip } from '@elastic/eui';
import { isEsqlOutputColumnsItem } from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { HeaderMenu } from '../../header_menu';
import * as i18n from '../../translations';

export interface ExceptionItemCardHeaderProps {
  item: ExceptionListItemSchema;
  actions: Array<{ key: string; icon: string; label: string | boolean; onClick: () => void }>;
  disableActions?: boolean;
  dataTestSubj: string;
}

export const ExceptionItemCardHeader = memo<ExceptionItemCardHeaderProps>(
  ({ item, actions, disableActions = false, dataTestSubj }) => {
    return (
      <EuiFlexGroup responsive data-test-subj={dataTestSubj} justifyContent="spaceBetween">
        <EuiFlexItem grow={9}>
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s" wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs" textTransform="uppercase" data-test-subj={`${dataTestSubj}Title`}>
                <h3>{item.name}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {isEsqlOutputColumnsItem(item) && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.EXCEPTION_ITEM_CARD_COMPUTED_COLUMNS_BADGE_TOOLTIP}>
                  <EuiBadge
                    color="hollow"
                    tabIndex={0}
                    data-test-subj={`${dataTestSubj}ComputedColumnsBadge`}
                  >
                    {i18n.EXCEPTION_ITEM_CARD_COMPUTED_COLUMNS_BADGE}
                  </EuiBadge>
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <HeaderMenu
            iconType="boxesVertical"
            disableActions={disableActions}
            actions={actions}
            ariaLabel={i18n.EXCEPTION_ITEM_CARD_ACTIONS_ARIA_LABEL(item.name)}
            dataTestSubj={dataTestSubj}
            anchorPosition="downCenter"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExceptionItemCardHeader.displayName = 'ExceptionItemCardHeader';
