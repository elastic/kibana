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
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import {
  FlyoutHeaderBlock,
  flyoutHeaderBlockStyles,
} from '../../../shared/components/flyout_header_block';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { Status } from './status';
import { Assignees } from './assignees';
import { Notes } from '../../../shared/components/notes';
import {
  HEADER_ALERTS_BLOCK_TEST_ID,
  HEADER_ASSIGNEES_BLOCK_TEST_ID,
  HEADER_BADGE_TEST_ID,
  HEADER_TITLE_TEST_ID,
} from '../constants/test_ids';
import { useHeaderData } from '../hooks/use_header_data';

const ATTACK_HEADER_BADGE = i18n.translate(
  'xpack.securitySolution.attackDetailsFlyout.header.badge.attackLabel',
  {
    defaultMessage: 'Attack',
  }
);

export interface HeaderTitleProps {
  /**
   * Parsed attack-discovery alert resolved by {@link useAttackDetails}.
   * Forwarded to the Status / Assignees blocks and used to derive the
   * Notes block's `attackId`.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Browser fields used by the Status block to enrich the workflow-status
   * field for the popover button.
   */
  browserFields: BrowserFields;
  /**
   * Field-browser-friendly representation of the event, used by the Status
   * block to find the workflow-status row.
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * Callback invoked after status mutations succeed; refetches the attack
   * document so the header reflects the new status.
   */
  refetch: () => Promise<void>;
  /**
   * Callback used by the Notes block to open the notes sub-flyout.
   */
  onShowNotes: () => void;
}

/**
 * Header data for the Attack details flyout
 */
export const HeaderTitle = memo(
  ({
    attack,
    browserFields,
    dataFormattedForFieldBrowser,
    refetch,
    onShowNotes,
  }: HeaderTitleProps) => {
    const { title, timestamp, alertsCount } = useHeaderData(attack);
    const attackId = attack.id;

    return (
      <>
        {timestamp && (
          <>
            <PreferenceFormattedDate value={new Date(timestamp)} />
            <EuiSpacer size="xs" />
          </>
        )}
        <FlyoutTitle data-test-subj={HEADER_TITLE_TEST_ID} title={title} iconType={'bolt'} />
        <EuiSpacer size="s" />
        <EuiBadge
          aria-label={ATTACK_HEADER_BADGE}
          color="hollow"
          data-test-subj={HEADER_BADGE_TEST_ID}
          tabIndex={0}
        >
          {ATTACK_HEADER_BADGE}
        </EuiBadge>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="row" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem css={flyoutHeaderBlockStyles}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <Status
                  attack={attack}
                  browserFields={browserFields}
                  dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <FlyoutHeaderBlock
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
                </FlyoutHeaderBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem css={flyoutHeaderBlockStyles}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <FlyoutHeaderBlock
                  hasBorder
                  title={
                    <FormattedMessage
                      id="xpack.securitySolution.attackDetailsFlyout.header.assigneesTitle"
                      defaultMessage="Assignees"
                    />
                  }
                  data-test-subj={HEADER_ASSIGNEES_BLOCK_TEST_ID}
                >
                  <Assignees attack={attack} refetch={refetch} />
                </FlyoutHeaderBlock>
              </EuiFlexItem>
              <EuiFlexItem>
                <Notes documentId={attackId} onShowNotes={onShowNotes} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

HeaderTitle.displayName = 'HeaderTitle';
