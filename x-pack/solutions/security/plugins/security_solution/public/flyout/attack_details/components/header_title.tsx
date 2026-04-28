/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ATTACK_DISCOVERY_AD_HOC_RULE_ID } from '@kbn/elastic-assistant-common';
import { flyoutHeaderBlockStyles } from '../../../flyout_v2/document/constants/styles';
import { FlyoutTitle } from '../../../flyout_v2/shared/components/flyout_title';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { Status } from './status';
import { Assignees } from './assignees';
import { Notes } from '../../../flyout_v2/shared/components/notes';
import { AlertHeaderBlock } from '../../../flyout_v2/shared/components/alert_header_block';
import {
  HEADER_ALERTS_BLOCK_TEST_ID,
  HEADER_ASSIGNEES_BLOCK_TEST_ID,
  HEADER_BADGE_TEST_ID,
  HEADER_TITLE_SCHEDULE_LINK_TEST_ID,
  HEADER_TITLE_TEST_ID,
} from '../constants/test_ids';
import { useHeaderData } from '../hooks/use_header_data';
import { useAttackDetailsContext } from '../context';
import { useNavigateToAttackDetailsLeftPanel } from '../hooks/use_navigate_to_attack_details_left_panel';
import { DetailsFlyout } from '../../../attack_discovery/pages/settings_flyout/schedule/details_flyout';
import { OPEN_SCHEDULE_DETAILS } from '../../../attack_discovery/pages/results/attack_discovery_panel/panel_header/primary_interactions/title/translations';

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
  const { attackId, attack } = useAttackDetailsContext();
  const openNotesTab = useNavigateToAttackDetailsLeftPanel({ tab: 'notes' });
  const [scheduleDetailsId, setScheduleDetailsId] = useState<string | undefined>();

  const alertRuleUuid = attack?.alertRuleUuid;
  const isScheduled = useMemo(
    () => alertRuleUuid != null && alertRuleUuid !== ATTACK_DISCOVERY_AD_HOC_RULE_ID,
    [alertRuleUuid]
  );

  const openScheduleDetails = useCallback(() => {
    if (alertRuleUuid == null) {
      return;
    }
    setScheduleDetailsId(alertRuleUuid);
  }, [alertRuleUuid]);

  const closeScheduleDetails = useCallback(() => setScheduleDetailsId(undefined), []);

  const titleBlock = (
    <FlyoutTitle data-test-subj={HEADER_TITLE_TEST_ID} title={title} iconType={'bolt'} />
  );

  return (
    <>
      {timestamp && (
        <>
          <PreferenceFormattedDate value={new Date(timestamp)} />
          <EuiSpacer size="xs" />
        </>
      )}
      {isScheduled ? (
        <EuiLink
          aria-label={OPEN_SCHEDULE_DETAILS}
          data-test-subj={HEADER_TITLE_SCHEDULE_LINK_TEST_ID}
          onClick={openScheduleDetails}
        >
          <FlyoutTitle
            data-test-subj={HEADER_TITLE_TEST_ID}
            title={title}
            iconType={'bolt'}
            isLink
          />
        </EuiLink>
      ) : (
        titleBlock
      )}
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
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <AlertHeaderBlock
                hasBorder
                title={
                  <FormattedMessage
                    id="xpack.securitySolution.attackDetailsFlyout.header.assigneesTitle"
                    defaultMessage="Assignees"
                  />
                }
                data-test-subj={HEADER_ASSIGNEES_BLOCK_TEST_ID}
              >
                <Assignees />
              </AlertHeaderBlock>
            </EuiFlexItem>
            <EuiFlexItem>
              <Notes documentId={attackId} onShowNotes={openNotesTab} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {scheduleDetailsId != null && (
        <DetailsFlyout scheduleId={scheduleDetailsId} onClose={closeScheduleDetails} />
      )}
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
