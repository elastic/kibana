/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type AttackDiscoveryAlert,
} from '@kbn/elastic-assistant-common';

import { IconSparkles } from '../../../../../common/icons/sparkles';
import { RuleStatus } from '../../../../../timelines/components/timeline/body/renderers/rule_status';
import { Subtitle } from './subtitle';

export const ATTACK_GROUP_TEST_ID_SUFFIX = '-group-renderer' as const;
export const ATTACK_TITLE_TEST_ID_SUFFIX = '-title' as const;
export const ATTACK_DESCRIPTION_TEST_ID_SUFFIX = '-description' as const;
export const ATTACK_STATUS_TEST_ID_SUFFIX = '-status' as const;
export const ATTACK_SPARKLES_ICON_TEST_ID_SUFFIX = '-sparkles-icon' as const;

export const AttackGroupContent = React.memo<{
  attack: AttackDiscoveryAlert;
  dataTestSubj?: string;
  showAnonymized?: boolean;
}>(({ attack, dataTestSubj, showAnonymized = false }) => {
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
    <EuiFlexGroup
      data-test-subj={`${dataTestSubj}${ATTACK_GROUP_TEST_ID_SUFFIX}`}
      direction="column"
      gutterSize="s"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle data-test-subj={`${dataTestSubj}${ATTACK_TITLE_TEST_ID_SUFFIX}`} size="xs">
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
  );
});
AttackGroupContent.displayName = 'AttackGroupContent';
