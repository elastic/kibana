/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiLoadingLogo, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { LOADING_LOGO_TEST_ID } from './test_ids';
import { useStyles } from './styles';
import { useIndicatorById } from '../hooks/use_indicator_by_id';
import type { IndicatorAttachmentMetadata } from '../utils/attachments';

export const INDICATOR_NAME_TEST_ID = 'tiCasesIndicatorName';
export const INDICATOR_FEED_NAME_TEST_ID = 'tiCasesIndicatorFeedName';
export const INDICATOR_TYPE_TEST_ID = 'tiCasesIndicatorTYPE';

export interface CommentChildrenProps {
  /**
   * Indicator's id of the indicator to fetch
   */
  id: string;
  /**
   * Metadata saved in the case attachment (indicator)
   */
  metadata: IndicatorAttachmentMetadata;
}

/**
 * Renders some basic values (indicator name, type and feed name) in the comment section
 * of the case attachment. Also renders a flyout for more details about the indicator.
 */
export const CommentChildren: FC<CommentChildrenProps> = ({ id, metadata }) => {
  const styles = useStyles();

  const { indicator, isLoading } = useIndicatorById(id);

  const { indicatorName, indicatorType, indicatorFeedName } = metadata;

  const { openFlyout } = useExpandableFlyoutApi();

  const open = useCallback(
    () =>
      openFlyout({
        right: {
          id: 'ioc-details-right',
          params: {
            id: indicator?._id,
          },
        },
      }),
    [indicator?._id, openFlyout]
  );

  if (isLoading) {
    return <EuiLoadingLogo data-test-subj={LOADING_LOGO_TEST_ID} logo="logoSecurity" size="xl" />;
  }

  return (
    <>
      <EuiFlexGroup css={styles.container} gutterSize="s" direction="column">
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.threatIntelligence.cases.indicatorName"
                  defaultMessage="Indicator name:"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink data-test-subj={INDICATOR_NAME_TEST_ID} onClick={open}>
                {indicatorName}
              </EuiLink>{' '}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.threatIntelligence.cases.indicatorFeedName"
                  defaultMessage="Feed name:"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p data-test-subj={INDICATOR_FEED_NAME_TEST_ID}>{indicatorFeedName}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.threatIntelligence.cases.indicatorType"
                  defaultMessage="Indicator type:"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p data-test-subj={INDICATOR_TYPE_TEST_ID}>{indicatorType}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </>
  );
};
