/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiBadge,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { MULTI_VALUE_CELL_FIRST_ITEM_VALUE, MULTI_VALUE_CELL_MORE_BUTTON } from '../constants';

const getShowMoreAriaLabel = (field: string, number: number) =>
  i18n.translate('securitySolutionPackages.csp.multiValueField.showMore', {
    defaultMessage: 'Field {field} has {number, plural, one {# item} other {#items}}',
    values: { field, number },
  });

interface MultiValueCellPopoverProps<T, K = string> {
  items: K[];
  field: string;
  object: T;
  renderItem: (item: K, i: number, field: string, object: T) => React.ReactNode;
  firstItemRenderer?: (item: K) => React.ReactNode;
}

const MultiValueCellPopoverComponent = <T, K = string>({
  items,
  field,
  object,
  renderItem,
  firstItemRenderer,
}: MultiValueCellPopoverProps<T, K>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const onButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiFlexGroup responsive={true} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        {firstItemRenderer ? (
          firstItemRenderer(items[0])
        ) : (
          <EuiText size="s" data-test-subj={MULTI_VALUE_CELL_FIRST_ITEM_VALUE}>
            {String(items[0])}
          </EuiText>
        )}
      </EuiFlexItem>
      {items.length > 1 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiBadge
                data-test-subj={MULTI_VALUE_CELL_MORE_BUTTON}
                color="hollow"
                onClick={onButtonClick}
                onClickAriaLabel={getShowMoreAriaLabel(field, items.length - 1)}
              >
                {`+ ${items.length - 1}`}
              </EuiBadge>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="s"
            repositionOnScroll
            panelStyle={{ minWidth: 'min-content' }}
          >
            <EuiFlexGroup
              direction="column"
              wrap={false}
              responsive={false}
              gutterSize="xs"
              justifyContent="flexStart"
              alignItems="flexStart"
              css={css`
                max-height: 230px;
                overflow-y: auto;
                max-width: min-content;
                width: min-content;
                min-width: unset;
                padding-right: ${euiTheme.size.s};
              `}
            >
              {items.map((item, index) => renderItem(item, index, field, object))}
            </EuiFlexGroup>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const MemoizedMultiValueCellPopoverComponent = React.memo(MultiValueCellPopoverComponent);
MemoizedMultiValueCellPopoverComponent.displayName = 'MultiValueCellPopover';

export const MultiValueCellPopover =
  MemoizedMultiValueCellPopoverComponent as typeof MultiValueCellPopoverComponent;
