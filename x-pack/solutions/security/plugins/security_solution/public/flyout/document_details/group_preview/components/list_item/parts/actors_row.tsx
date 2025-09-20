/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiIcon } from '@elastic/eui';
import {
  GROUPED_LIST_ITEM_ACTOR_TEST_ID,
  GROUPED_LIST_ITEM_TARGET_TEST_ID,
} from '../../../test_ids';
import type { AlertItem } from '../types';

export interface ActorsRowProps {
  actor: NonNullable<AlertItem['actor']>;
  target: NonNullable<AlertItem['target']>;
}

export const ActorsRow = ({ actor, target }: ActorsRowProps) => {
  return (
    <EuiFlexGroup wrap gutterSize="xs" responsive={false} alignItems="center" direction="row">
      <EuiFlexItem grow={false} data-test-subj={GROUPED_LIST_ITEM_ACTOR_TEST_ID}>
        <EuiBadge color="hollow" iconType={actor.icon} iconSide="left">
          {actor.label || actor.id}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="sortRight" size="m" color="subdued" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj={GROUPED_LIST_ITEM_TARGET_TEST_ID}>
        <EuiBadge color="hollow" iconType={target.icon} iconSide="left">
          {target.label || target.id}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
