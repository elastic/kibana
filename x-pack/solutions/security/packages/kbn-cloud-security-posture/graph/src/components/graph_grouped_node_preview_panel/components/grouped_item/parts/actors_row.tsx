/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiIcon, EuiToolTip } from '@elastic/eui';
import {
  GROUPED_ITEM_ACTOR_TEST_ID,
  GROUPED_ITEM_TARGET_OVERFLOW_TEST_ID,
  GROUPED_ITEM_TARGET_TEST_ID,
} from '../../../test_ids';
import type { AlertItem } from '../types';
import { displayEntityName } from '../utils';

const targetsOverflowTitle = i18n.translate(
  'securitySolutionPackages.csp.graph.groupedItem.targetsOverflowTitle',
  { defaultMessage: 'Additional targets' }
);

export interface ActorsRowProps {
  actor?: AlertItem['actor'];
  target?: AlertItem['target'];
}

const badgeStyles = css`
  max-width: 200px;
`;

interface EntityBadgeProps {
  name: string;
  /** False when nothing was resolved: the badge shows a dash and has no tooltip. */
  hasValue: boolean;
  icon?: string;
  testSubj: string;
}

/** Hollow badge truncated to a fixed width, with the full name in a tooltip. */
const EntityBadge = ({ name, hasValue, icon, testSubj }: EntityBadgeProps) => {
  const badge = (
    <EuiBadge
      color="hollow"
      iconType={icon}
      iconSide="left"
      tabIndex={hasValue ? 0 : undefined}
      data-test-subj={testSubj}
      css={badgeStyles}
    >
      {name}
    </EuiBadge>
  );

  return hasValue ? (
    <EuiToolTip position="top" content={name}>
      {badge}
    </EuiToolTip>
  ) : (
    badge
  );
};

export const ActorsRow = ({ actor, target }: ActorsRowProps) => {
  const [firstTarget, ...otherTargets] = target?.ids ?? [];

  return (
    <EuiFlexGroup wrap gutterSize="xs" responsive={false} alignItems="center" direction="row">
      <EuiFlexItem grow={false}>
        <EntityBadge
          name={displayEntityName({ label: actor?.label, id: actor?.id ?? '' })}
          hasValue={Boolean(actor)}
          icon={actor?.icon}
          testSubj={GROUPED_ITEM_ACTOR_TEST_ID}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="sortRight" size="m" color="subdued" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EntityBadge
          name={displayEntityName({ label: target?.label, id: firstTarget ?? '' })}
          hasValue={firstTarget !== undefined}
          icon={target?.icon}
          testSubj={GROUPED_ITEM_TARGET_TEST_ID}
        />
      </EuiFlexItem>
      {otherTargets.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" title={targetsOverflowTitle} content={otherTargets.join(', ')}>
            <EuiBadge
              color="hollow"
              tabIndex={0}
              data-test-subj={GROUPED_ITEM_TARGET_OVERFLOW_TEST_ID}
            >{`+${otherTargets.length}`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
