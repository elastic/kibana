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

export const INVESTIGATION_LIST_PAGE_SIZE = 20;

export interface InvestigationListProps {
  investigations: ListInvestigationItem[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  selectedInvestigationId?: string;
  onInvestigationClick?: (investigation: ListInvestigationItem) => void;
}

export function InvestigationList({
  investigations,
  total,
  page,
  onPageChange,
  selectedInvestigationId,
  onInvestigationClick,
}: InvestigationListProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();

  const roundedPanelCss = css`
    box-sizing: border-box;
    overflow: hidden;
    border-radius: ${euiTheme.size.s};
  `;

  const shown = (page - 1) * INVESTIGATION_LIST_PAGE_SIZE + investigations.length;
  const hasMore = shown < total;
  const hasPrev = page > 1;

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

      {(hasMore || hasPrev) && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            gutterSize="s"
            responsive={false}
          >
            {hasPrev && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="nightshiftInvestigationsPrevPageButton"
                  iconType="arrowLeft"
                  size="s"
                  onClick={() => onPageChange(page - 1)}
                >
                  {i18n.translate('xpack.nightshift.investigations.prevPageButton', {
                    defaultMessage: 'Previous',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="xs">
                {i18n.translate('xpack.nightshift.investigations.showingCount', {
                  defaultMessage: 'Showing {shown} of {total}',
                  values: { shown, total },
                })}
              </EuiText>
            </EuiFlexItem>
            {hasMore && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="nightshiftInvestigationsNextPageButton"
                  iconType="arrowRight"
                  iconSide="right"
                  size="s"
                  onClick={() => onPageChange(page + 1)}
                >
                  {i18n.translate('xpack.nightshift.investigations.nextPageButton', {
                    defaultMessage: 'Next',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
}
