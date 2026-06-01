/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiToolTip } from '@elastic/eui';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
  replaceAnonymizedValuesWithOriginalValues,
  type AttackDiscoveryAlert,
} from '@kbn/elastic-assistant-common';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import { DetailsFlyout } from '../../../../../attack_discovery/pages/settings_flyout/schedule/details_flyout';
import { ScheduleDetailsButton } from '../../schedule_details_button/schedule_details_button';
import { RuleStatus } from '../../../../../timelines/components/timeline/body/renderers/rule_status';
import { Subtitle } from './subtitle';
import { TagsBadge } from './tags_badge';
import { AssigneesBadge } from './assignees_badge';

export const EXPAND_BUTTON_ARIAL_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.attacks.tableSection.expandButtonArialLabel',
  {
    defaultMessage: 'Open attack details',
  }
);

export const ATTACK_GROUP_TEST_ID_SUFFIX = '-group-renderer' as const;
export const ATTACK_TITLE_TEST_ID_SUFFIX = '-title' as const;
export const ATTACK_DESCRIPTION_TEST_ID_SUFFIX = '-description' as const;
export const ATTACK_STATUS_TEST_ID_SUFFIX = '-status' as const;
export const ATTACK_ASSIGNEES_TEST_ID_SUFFIX = '-assignees' as const;
export const EXPAND_ATTACK_BUTTON_TEST_ID = 'expand-attack-button';

export interface AttackGroupContentProps {
  /** The attack alert object to display */
  attack: AttackDiscoveryAlert;
  /** Optional data-test-subj prefix for testing */
  dataTestSubj?: string;
  /** Whether to show anonymized values in the title and description */
  showAnonymized?: boolean;
  /** Callback to open the attack details flyout */
  openAttackDetailsFlyout: () => void;
}

export const AttackGroupContent = React.memo<AttackGroupContentProps>(
  ({ attack, dataTestSubj, showAnonymized = false, openAttackDetailsFlyout }) => {
    const {
      services: { telemetry },
    } = useKibana();

    const [scheduleDetailsId, setScheduleDetailsId] = useState<string | undefined>(undefined);

    const alertRuleUuid = attack.alertRuleUuid;

    const isScheduled = useMemo(
      () => alertRuleUuid != null && alertRuleUuid !== ATTACK_DISCOVERY_AD_HOC_RULE_ID,
      [alertRuleUuid]
    );

    const openScheduleDetails = useCallback(() => {
      setScheduleDetailsId(alertRuleUuid);
      telemetry.reportEvent(AttacksEventTypes.ScheduleDetailsFlyoutOpened, {
        source: 'attacks_page_table',
      });
    }, [alertRuleUuid, telemetry]);

    const onCloseScheduleDetails = useCallback(() => setScheduleDetailsId(undefined), []);

    const title = useMemo(
      () =>
        showAnonymized
          ? attack.title
          : replaceAnonymizedValuesWithOriginalValues({
              messageContent: attack.title,
              replacements: attack.replacements,
            }),
      [attack.replacements, attack.title, showAnonymized]
    );

    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={EXPAND_BUTTON_ARIAL_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={EXPAND_BUTTON_ARIAL_LABEL}
              color="text"
              data-test-subj={EXPAND_ATTACK_BUTTON_TEST_ID}
              iconType="maximize"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                openAttackDetailsFlyout();
              }}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            data-test-subj={`${dataTestSubj}${ATTACK_GROUP_TEST_ID_SUFFIX}`}
            direction="column"
            gutterSize="s"
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle
                    data-test-subj={`${dataTestSubj}${ATTACK_TITLE_TEST_ID_SUFFIX}`}
                    size="xs"
                  >
                    <h5>{title}</h5>
                  </EuiTitle>
                </EuiFlexItem>
                {isScheduled && <ScheduleDetailsButton onClick={openScheduleDetails} />}
                <EuiFlexItem
                  grow={false}
                  data-test-subj={`${dataTestSubj}${ATTACK_STATUS_TEST_ID_SUFFIX}`}
                >
                  <RuleStatus value={attack.alertWorkflowStatus} />
                </EuiFlexItem>
                {attack.tags && attack.tags.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <TagsBadge tags={attack.tags} />
                  </EuiFlexItem>
                )}
                {attack.assignees && attack.assignees.length > 0 && (
                  <EuiFlexItem
                    grow={false}
                    data-test-subj={`${dataTestSubj}${ATTACK_ASSIGNEES_TEST_ID_SUFFIX}`}
                  >
                    <AssigneesBadge assignees={attack.assignees} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              data-test-subj={`${dataTestSubj}${ATTACK_DESCRIPTION_TEST_ID_SUFFIX}`}
            >
              <Subtitle attack={attack} showAnonymized={showAnonymized} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {scheduleDetailsId && (
          <DetailsFlyout scheduleId={scheduleDetailsId} onClose={onCloseScheduleDetails} />
        )}
      </EuiFlexGroup>
    );
  }
);
AttackGroupContent.displayName = 'AttackGroupContent';
