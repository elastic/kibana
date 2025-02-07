/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { uniq } from 'lodash/fp';
import React from 'react';

import { DraggableBadge } from '../../../../common/components/draggables';

export const PROCESS_NAME_FIELD_NAME = 'process.name';
export const USER_NAME_FIELD_NAME = 'user.name';

/**
 * Renders a column of draggable badges containing:
 * - `user.name`
 * - `process.name`
 */
export const UserProcess = React.memo<{
  contextId: string;
  eventId: string;
  processName?: string[] | null;
  userName?: string[] | null;
}>(({ contextId, eventId, processName, userName }) => (
  <EuiFlexGroup
    alignItems="flexStart"
    data-test-subj="user-process"
    direction="column"
    justifyContent="center"
    gutterSize="none"
  >
    {userName != null
      ? uniq(userName).map((user) => (
          <EuiFlexItem grow={false} key={user}>
            <DraggableBadge
              contextId={contextId}
              data-test-subj="user-name"
              eventId={eventId}
              field={USER_NAME_FIELD_NAME}
              value={user}
              iconType="user"
              isAggregatable={true}
              fieldType="keyword"
            />
          </EuiFlexItem>
        ))
      : null}

    {processName != null
      ? uniq(processName).map((process) => (
          <EuiFlexItem grow={false} key={process}>
            <DraggableBadge
              contextId={contextId}
              eventId={eventId}
              field={PROCESS_NAME_FIELD_NAME}
              value={process}
              iconType="console"
              isAggregatable={true}
              fieldType="keyword"
            />
          </EuiFlexItem>
        ))
      : null}
  </EuiFlexGroup>
));

UserProcess.displayName = 'UserProcess';
