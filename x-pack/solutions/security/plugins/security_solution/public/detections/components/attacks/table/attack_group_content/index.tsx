/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type AttackDiscoveryAlert,
} from '@kbn/elastic-assistant-common';
import { i18n } from '@kbn/i18n';

import { IconSparkles } from '../../../../../common/icons/sparkles';
import { RuleStatus } from '../../../../../timelines/components/timeline/body/renderers/rule_status';
import { Subtitle } from './subtitle';

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
export const ATTACK_SPARKLES_ICON_TEST_ID_SUFFIX = '-sparkles-icon' as const;
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
          <EuiButtonIcon
            aria-label={EXPAND_BUTTON_ARIAL_LABEL}
            color="text"
            data-test-subj={EXPAND_ATTACK_BUTTON_TEST_ID}
            iconType="expand"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              openAttackDetailsFlyout();
            }}
            size="s"
          />
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
                <EuiFlexItem grow={false}>
                  <IconSparkles
                    data-test-subj={`${dataTestSubj}${ATTACK_SPARKLES_ICON_TEST_ID_SUFFIX}`}
                  />
                </EuiFlexItem>
                <EuiFlexItem
                  grow={false}
                  data-test-subj={`${dataTestSubj}${ATTACK_STATUS_TEST_ID_SUFFIX}`}
                >
                  <RuleStatus value={attack.alertWorkflowStatus} />
                </EuiFlexItem>
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
      </EuiFlexGroup>
    );
  }
);
AttackGroupContent.displayName = 'AttackGroupContent';
