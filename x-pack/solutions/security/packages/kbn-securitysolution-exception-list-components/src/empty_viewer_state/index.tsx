/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FC } from 'react';
import { css } from '@emotion/react';
import {
  EuiSkeletonText,
  EuiImage,
  EuiEmptyPrompt,
  EuiButton,
  useEuiTheme,
  EuiPanel,
} from '@elastic/eui';
import type { ExpressionColor } from '@elastic/eui/src/components/expression/expression';
import type { EuiFacetGroupLayout } from '@elastic/eui/src/components/facet/facet_group';
import { ListTypeText, ViewerStatus } from '../types';
import * as i18n from '../translations';
import illustration from '../assets/images/illustration_product_no_results_magnifying_glass.svg';

interface EmptyViewerStateProps {
  title?: string;
  body?: string;
  buttonText?: string;
  listType?: ListTypeText;
  isReadOnly: boolean;
  viewerStatus: ViewerStatus;
  onEmptyButtonStateClick?: () => void | null;
}

const EmptyViewerStateComponent: FC<EmptyViewerStateProps> = ({
  title,
  body,
  buttonText,
  listType,
  isReadOnly,
  viewerStatus,
  onEmptyButtonStateClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const panelCss = css`
    margin: ${euiTheme.size.l} 0;
    padding: ${euiTheme.size.l} 0;
  `;

  const euiEmptyPromptProps = useMemo(() => {
    switch (viewerStatus) {
      case ViewerStatus.ERROR: {
        return {
          color: 'danger' as ExpressionColor,
          iconType: 'error',
          title: (
            <h2 data-test-subj="errorTitle">{title || i18n.EMPTY_VIEWER_STATE_ERROR_TITLE}</h2>
          ),
          body: <p data-test-subj="errorBody">{body || i18n.EMPTY_VIEWER_STATE_ERROR_BODY}</p>,
          'data-test-subj': 'errorViewerState',
        };
      }
      case ViewerStatus.EMPTY:
        return {
          color: 'subdued' as ExpressionColor,
          iconType: 'plusInCircle',
          iconColor: euiTheme.colors.darkestShade,
          title: (
            <h2 data-test-subj="emptyTitle">{title || i18n.EMPTY_VIEWER_STATE_EMPTY_TITLE}</h2>
          ),
          body: <p data-test-subj="emptyBody">{body || i18n.EMPTY_VIEWER_STATE_EMPTY_BODY}</p>,
          'data-test-subj': 'emptyViewerState',
          actions: [
            <EuiButton
              data-test-subj="emptyStateButton"
              onClick={onEmptyButtonStateClick}
              iconType="plusInCircle"
              color="primary"
              isDisabled={isReadOnly}
              fill
            >
              {buttonText || i18n.EMPTY_VIEWER_STATE_EMPTY_VIEWER_BUTTON(listType || 'rule')}
            </EuiButton>,
          ],
        };
      case ViewerStatus.EMPTY_SEARCH:
        return {
          color: 'plain' as ExpressionColor,
          layout: 'horizontal' as EuiFacetGroupLayout,
          hasBorder: true,
          hasShadow: false,
          icon: <EuiImage size="fullWidth" alt="" src={illustration} />,
          title: (
            <h3 data-test-subj="emptySearchTitle">
              {title || i18n.EMPTY_VIEWER_STATE_EMPTY_SEARCH_TITLE}
            </h3>
          ),
          body: (
            <p data-test-subj="emptySearchBody">
              {body || i18n.EMPTY_VIEWER_STATE_EMPTY_SEARCH_BODY}
            </p>
          ),
          'data-test-subj': 'emptySearchViewerState',
        };
    }
  }, [
    viewerStatus,
    euiTheme.colors.darkestShade,
    title,
    body,
    onEmptyButtonStateClick,
    isReadOnly,
    buttonText,
    listType,
  ]);

  return (
    <EuiSkeletonText
      lines={4}
      data-test-subj="loadingViewerState"
      isLoading={viewerStatus === ViewerStatus.LOADING || viewerStatus === ViewerStatus.SEARCHING}
    >
      <EuiPanel css={panelCss} color={viewerStatus === 'empty_search' ? 'subdued' : 'transparent'}>
        <EuiEmptyPrompt {...euiEmptyPromptProps} />
      </EuiPanel>
    </EuiSkeletonText>
  );
};

export const EmptyViewerState = React.memo(EmptyViewerStateComponent);

EmptyViewerState.displayName = 'EmptyViewerState';
