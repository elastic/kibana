/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { Status } from './status';
import { AlertHeaderBlock } from '../../shared/components/alert_header_block';
import {
  HEADER_ALERTS_BLOCK_TEST_ID,
  HEADER_BADGE_TEST_ID,
  HEADER_TITLE_TEST_ID,
} from '../constants/test_ids';
import { useHeaderData } from '../hooks/use_header_data';

// minWidth for each block, allows to switch for a 1 row 4 blocks to 2 rows with 2 block each
const blockStyles = {
  minWidth: 280,
};

const ATTACK_HEADER_BADGE = i18n.translate(
  'xpack.securitySolution.attackDetailsFlyout.header.badge.attackLabel',
  {
    defaultMessage: 'Attack',
  }
);

/**
 * Header data for the Attack details flyout
 */
export const HeaderTitle = memo(() => {
  const { title, timestamp, alertsCount } = useHeaderData();

  return (
    <>
      <EuiBadge
        aria-label={ATTACK_HEADER_BADGE}
        color="hollow"
        data-test-subj={HEADER_BADGE_TEST_ID}
        tabIndex={0}
      >
        {ATTACK_HEADER_BADGE}
      </EuiBadge>
      <EuiSpacer size="m" />
      {timestamp && (
        <>
          <PreferenceFormattedDate value={new Date(timestamp)} />
          <EuiSpacer size="xs" />
        </>
      )}
      <FlyoutTitle data-test-subj={HEADER_TITLE_TEST_ID} title={title} iconType={'bolt'} />
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem css={blockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <Status />
            </EuiFlexItem>
            <EuiFlexItem>
              <AlertHeaderBlock
                hasBorder
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.attackDetailsFlyout.header.alertsTitle"
                    defaultMessage="Alerts"
                  />
                }
                data-test-subj={HEADER_ALERTS_BLOCK_TEST_ID}
              >
                {alertsCount}
              </AlertHeaderBlock>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
