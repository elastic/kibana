/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { DraggableBadge } from '../../../../../../common/components/draggables';
import { OverflowField } from '../../../../../../common/components/tables/helpers';

import * as i18n from './translations';
import { NetflowRenderer } from '../netflow';
import { UserHostWorkingDir } from '../user_host_working_dir';
import { Details, TokensFlexItem } from '../helpers';
import { ProcessDraggable } from '../process_draggable';
import { Package } from './package';
import { AuthSsh } from './auth_ssh';
import { Badge } from '../../../../../../common/components/page';

interface Props {
  contextId: string;
  hostName: string | null | undefined;
  id: string;
  message: string | null | undefined;
  outcome: string | null | undefined;
  packageName: string | null | undefined;
  packageSummary: string | null | undefined;
  packageVersion: string | null | undefined;
  processExecutable: string | null | undefined;
  processPid: number | null | undefined;
  processName: string | null | undefined;
  sshMethod: string | null | undefined;
  sshSignature: string | null | undefined;
  text: string | null | undefined;
  userDomain: string | null | undefined;
  userName: string | null | undefined;
  workingDirectory: string | null | undefined;
}

export const SystemGenericLine = React.memo<Props>(
  ({
    contextId,
    hostName,
    id,
    message,
    outcome,
    packageName,
    packageSummary,
    packageVersion,
    processPid,
    processName,
    processExecutable,
    sshSignature,
    sshMethod,
    text,
    userDomain,
    userName,
    workingDirectory,
  }) => (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none" wrap={true}>
        <UserHostWorkingDir
          contextId={contextId}
          eventId={id}
          hostName={hostName}
          userDomain={userDomain}
          userName={userName}
          workingDirectory={workingDirectory}
        />
        <TokensFlexItem grow={false} component="span">
          {text}
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          <ProcessDraggable
            contextId={contextId}
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId={id}
            processPid={processPid}
            processName={processName}
            processExecutable={processExecutable}
          />
        </TokensFlexItem>
        {outcome != null && (
          <TokensFlexItem grow={false} component="span">
            {i18n.WITH_RESULT}
          </TokensFlexItem>
        )}
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={id}
            field="event.outcome"
            queryValue={outcome}
            value={outcome}
            isAggregatable={true}
            fieldType="keyword"
          />
        </TokensFlexItem>
        <AuthSsh
          contextId={contextId}
          eventId={id}
          sshSignature={sshSignature}
          sshMethod={sshMethod}
        />
        <Package
          contextId={contextId}
          eventId={id}
          packageName={packageName}
          packageSummary={packageSummary}
          packageVersion={packageVersion}
        />
      </EuiFlexGroup>
      {message != null && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
            <TokensFlexItem grow={false} component="span">
              <Badge iconType="editorComment" color="hollow" title="">
                <OverflowField value={message} />
              </Badge>
            </TokensFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  )
);

SystemGenericLine.displayName = 'SystemGenericLine';

interface GenericDetailsProps {
  contextId: string;
  data: Ecs;
  text: string;
  timelineId: string;
}

export const SystemGenericDetails = React.memo<GenericDetailsProps>(
  ({ contextId, data, text, timelineId }) => {
    const id = data._id;
    const message: string | null = data.message != null ? data.message[0] : null;
    const hostName: string | null | undefined = get('host.name[0]', data);
    const userDomain: string | null | undefined = get('user.domain[0]', data);
    const userName: string | null | undefined = get('user.name[0]', data);
    const outcome: string | null | undefined = get('event.outcome[0]', data);
    const packageName: string | null | undefined = get('system.audit.package.name[0]', data);
    const packageSummary: string | null | undefined = get('system.audit.package.summary[0]', data);
    const packageVersion: string | null | undefined = get('system.audit.package.version[0]', data);
    const processPid: number | null | undefined = get('process.pid[0]', data);
    const processName: string | null | undefined = get('process.name[0]', data);
    const processExecutable: string | null | undefined = get('process.executable[0]', data);
    const sshSignature: string | null | undefined = get('system.auth.ssh.signature[0]', data);
    const sshMethod: string | null | undefined = get('system.auth.ssh.method[0]', data);
    const workingDirectory: string | null | undefined = get('process.working_directory[0]', data);

    return (
      <Details>
        <SystemGenericLine
          contextId={contextId}
          hostName={hostName}
          id={id}
          message={message}
          outcome={outcome}
          packageName={packageName}
          packageSummary={packageSummary}
          packageVersion={packageVersion}
          processExecutable={processExecutable}
          processPid={processPid}
          processName={processName}
          sshMethod={sshMethod}
          sshSignature={sshSignature}
          text={text}
          userDomain={userDomain}
          userName={userName}
          workingDirectory={workingDirectory}
        />
        <EuiSpacer size="s" />
        <NetflowRenderer data={data} timelineId={timelineId} />
      </Details>
    );
  }
);

SystemGenericDetails.displayName = 'SystemGenericDetails';
