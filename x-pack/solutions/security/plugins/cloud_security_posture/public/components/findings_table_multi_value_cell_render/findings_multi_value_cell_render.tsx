/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { get } from 'lodash/fp';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiBadgeGroup,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { VulnerabilityGroupingMultiValueOptions } from '../../common/types';
import { getShowMoreAriaLabel } from '../../pages/vulnerabilities/translations';

interface FindingsMultiValueCellRenderProps<T, K = string> {
  finding: T;
  multiValueField: VulnerabilityGroupingMultiValueOptions;
  renderItem: (item: K, i: number, field: string, finding: T) => React.ReactNode;
}

const FindingsMultiValueCellRenderComponent = <T extends Record<string, any>, K = string>({
  finding,
  multiValueField,
  renderItem,
}: FindingsMultiValueCellRenderProps<T, K>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { euiTheme } = useEuiTheme();
  const value = get(multiValueField, finding) as K;

  if (!Array.isArray(value)) {
    return <>{value || '-'}</>;
  }

  const onButtonClick = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  return (
    <EuiFlexGroup wrap={false} responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>{value[0]}</EuiFlexItem>
      {value.length > 1 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiBadge
                color="hollow"
                onClick={onButtonClick}
                onClickAriaLabel={getShowMoreAriaLabel(multiValueField, value.length - 1)}
              >
                + {value.length - 1}
              </EuiBadge>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="s"
            repositionOnScroll
          >
            <EuiBadgeGroup
              gutterSize="s"
              css={css`
                max-height: 230px;
                overflow-y: auto;
                max-width: min-content;
                width: min-content;
                padding-right: ${euiTheme.size.s};
              `}
            >
              {value.map((item, index) => renderItem(item, index, multiValueField, finding))}
            </EuiBadgeGroup>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const MemoizedFindingsMultiValueCellRenderComponent = React.memo(
  FindingsMultiValueCellRenderComponent
);
MemoizedFindingsMultiValueCellRenderComponent.displayName = 'FindingsMultiValueCellRenderComponent';

export const FindingsMultiValueCellRender =
  MemoizedFindingsMultiValueCellRenderComponent as typeof FindingsMultiValueCellRenderComponent;
