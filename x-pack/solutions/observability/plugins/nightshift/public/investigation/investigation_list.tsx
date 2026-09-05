/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ListInvestigationItem } from '@kbn/nightshift-investigations-plugin/common';

import { InvestigationListItem } from './investigation_list_item';

export const INVESTIGATION_LIST_PAGE_SIZES = [20, 50, 100] as const;
export type InvestigationListPageSize = (typeof INVESTIGATION_LIST_PAGE_SIZES)[number];

const getNextPageSize = (
  current: InvestigationListPageSize
): InvestigationListPageSize | undefined => {
  const index = INVESTIGATION_LIST_PAGE_SIZES.indexOf(current);
  const next = INVESTIGATION_LIST_PAGE_SIZES[index + 1];
  // next is InvestigationListPageSize | undefined depending on whether index+1 is in range
  return next;
};

export interface InvestigationListProps {
  investigations: ListInvestigationItem[];
  total: number;
  size: InvestigationListPageSize;
  onSizeChange: (size: InvestigationListPageSize) => void;
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: ListInvestigationItem) => void;
}

export function InvestigationList({
  investigations,
  total,
  size,
  onSizeChange,
  selectedInvestigationId,
  onInvestigationClick,
}: InvestigationListProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  const roundedPanelCss = css`
    box-sizing: border-box;
    overflow: hidden;
    border-radius: ${euiTheme.size.s};
  `;

  const heading = (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.medium};
            `}
          >
            <h2>
              {i18n.translate('xpack.nightshift.investigations.listTitle', {
                defaultMessage: 'Investigations',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge>{total}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );

  if (investigations.length === 0) {
    return (
      <>
        {heading}
        <EuiPanel hasBorder hasShadow={false} paddingSize="l" color="subdued" css={roundedPanelCss}>
          <EuiText textAlign="center" color="subdued" size="s">
            <p>
              {i18n.translate('xpack.nightshift.investigations.emptyDescription', {
                defaultMessage: 'No investigations found',
              })}
            </p>
          </EuiText>
        </EuiPanel>
      </>
    );
  }

  const nextPageSize = getNextPageSize(size);
  const hasMore = investigations.length < total;

  return (
    <>
      {heading}
      <EuiPanel hasBorder hasShadow={false} paddingSize="none" css={roundedPanelCss}>
        <ol
          css={css`
            list-style: none;
            margin: 0;
            padding: 0;
          `}
        >
          {investigations.map((investigation, index) => (
            <li
              key={investigation.investigation_id}
              css={
                index < investigations.length - 1
                  ? css`
                      border-bottom: ${euiTheme.border.thin};
                    `
                  : undefined
              }
            >
              <InvestigationListItem
                investigation={investigation}
                isSelected={investigation.investigation_id === selectedInvestigationId}
                onClick={onInvestigationClick}
              />
            </li>
          ))}
        </ol>
      </EuiPanel>

      {hasMore && nextPageSize !== undefined && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="nightshiftInvestigationsShowMoreButton"
                size="s"
                onClick={() => onSizeChange(nextPageSize)}
              >
                {i18n.translate('xpack.nightshift.investigations.showMoreButton', {
                  defaultMessage: 'Show more',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs">
                {i18n.translate('xpack.nightshift.investigations.showingCount', {
                  defaultMessage: 'Showing {shown} of {total}',
                  values: { shown: investigations.length, total },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
}
