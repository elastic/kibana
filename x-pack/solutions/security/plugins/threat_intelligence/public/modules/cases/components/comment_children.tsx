/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, VFC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiLoadingLogo, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LOADING_LOGO_TEST_ID } from './test_ids';
import { Indicator } from '../../../../common/types/indicator';
import { IndicatorsFlyout } from '../../indicators/components/flyout/flyout';
import { useStyles } from './styles';
import { useIndicatorById } from '../hooks/use_indicator_by_id';
import { AttachmentMetadata } from '../utils/attachments';

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
  metadata: AttachmentMetadata;
}

/**
 * Renders some basic values (indicator name, type and feed name) in the comment section
 * of the case attachment. Also renders a flyout for more details about the indicator.
 */
export const CommentChildren: VFC<CommentChildrenProps> = ({ id, metadata }) => {
  const styles = useStyles();
  const [expanded, setExpanded] = useState<boolean>(false);

  const { indicator, isLoading } = useIndicatorById(id);

  const { indicatorName, indicatorType, indicatorFeedName } = metadata;

  const flyoutFragment = useMemo(
    () =>
      expanded ? (
        <IndicatorsFlyout
          indicator={indicator as Indicator}
          closeFlyout={() => setExpanded(false)}
          kqlBarIntegration={true}
          indicatorName={indicatorName}
        />
      ) : null,
    [expanded, indicator, indicatorName]
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
                  id="xpack.threatIntelligence.cases.indicatorName"
                  defaultMessage="Indicator name:"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink data-test-subj={INDICATOR_NAME_TEST_ID} onClick={() => setExpanded(true)}>
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
                  id="xpack.threatIntelligence.cases.indicatorFeedName"
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
                  id="xpack.threatIntelligence.cases.indicatorType"
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

      {flyoutFragment}
    </>
  );
};
