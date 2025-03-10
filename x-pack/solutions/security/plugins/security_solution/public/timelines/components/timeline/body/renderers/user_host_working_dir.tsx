/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DraggableBadge } from '../../../../../common/components/draggables';
import { TokensFlexItem } from './helpers';
import { HostWorkingDir } from './host_working_dir';

interface Props {
  contextId: string;
  eventId: string;
  hostName: string | null | undefined;
  hostNameSeparator?: string;
  userDomain: string | null | undefined;
  userDomainField?: string;
  userName: string | null | undefined;
  userNameField?: string;
  workingDirectory: string | null | undefined;
}

export const UserHostWorkingDir = React.memo<Props>(
  ({
    contextId,
    eventId,
    hostName,
    hostNameSeparator = '@',
    userDomain,
    userDomainField = 'user.domain',
    userName,
    userNameField = 'user.name',
    workingDirectory,
  }) =>
    userName != null || userDomain != null || hostName != null || workingDirectory != null ? (
      <>
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field={userNameField}
            value={userName}
            iconType="user"
            fieldType="keyword"
            isAggregatable={true}
          />
        </TokensFlexItem>

        {userDomain != null && (
          <>
            <TokensFlexItem
              data-test-subj="user-host-working-dir-domain-separator-text"
              grow={false}
              component="span"
            >
              {'\\'}
            </TokensFlexItem>
            <TokensFlexItem grow={false} component="span">
              <DraggableBadge
                contextId={contextId}
                eventId={eventId}
                field={userDomainField}
                value={userDomain}
                fieldType="keyword"
                isAggregatable={true}
              />
            </TokensFlexItem>
          </>
        )}

        {hostName != null && userName != null && (
          <TokensFlexItem grow={false} component="span">
            {hostNameSeparator}
          </TokensFlexItem>
        )}
        <HostWorkingDir
          contextId={contextId}
          eventId={eventId}
          hostName={hostName}
          workingDirectory={workingDirectory}
        />
      </>
    ) : null
);

UserHostWorkingDir.displayName = 'UserHostWorkingDir';
