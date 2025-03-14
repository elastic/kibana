/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React, { useMemo } from 'react';

import { DraggableBadge } from '../../../../../../common/components/draggables';
import { isNillEmptyOrNotFinite, TokensFlexItem } from '../helpers';
import { ProcessDraggableWithNonExistentProcess } from '../process_draggable';
import { UserHostWorkingDir } from '../user_host_working_dir';

import * as i18n from './translations';

interface Props {
  contextId: string;
  hostName: string | null | undefined;
  id: string;
  processName: string | null | undefined;
  processPid: number | null | undefined;
  registryKey: string | null | undefined;
  registryPath: string | null | undefined;
  text: string;
  userDomain: string | null | undefined;
  userName: string | null | undefined;
}

const RegistryEventDetailsLineComponent: React.FC<Props> = ({
  contextId,
  hostName,
  id,
  processName,
  processPid,
  registryKey,
  registryPath,
  text,
  userDomain,
  userName,
}) => {
  const registryKeyTooltipContent = useMemo(
    () => (
      <>
        <div>{'registry.key'}</div>
        <div>{registryKey}</div>
      </>
    ),
    [registryKey]
  );

  const registryPathTooltipContent = useMemo(
    () => (
      <>
        <div>{'registry.path'}</div>
        <div>{registryPath}</div>
      </>
    ),
    [registryPath]
  );

  if (isNillEmptyOrNotFinite(registryKey)) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none" wrap={true}>
        <UserHostWorkingDir
          contextId={contextId}
          eventId={id}
          hostName={hostName}
          userDomain={userDomain}
          userName={userName}
          workingDirectory={undefined}
        />

        {!isNillEmptyOrNotFinite(registryKey) && (
          <>
            <TokensFlexItem component="span" data-test-subj="text" grow={false}>
              {text}
            </TokensFlexItem>
            <TokensFlexItem component="span" grow={false}>
              <DraggableBadge
                contextId={contextId}
                eventId={id}
                field="registry.key"
                tooltipContent={registryKeyTooltipContent}
                value={registryKey}
                isAggregatable={true}
                fieldType="keyword"
              />
            </TokensFlexItem>
          </>
        )}

        {!isNillEmptyOrNotFinite(registryPath) && (
          <>
            <TokensFlexItem component="span" data-test-subj="with-new-value" grow={false}>
              {i18n.WITH_NEW_VALUE}
            </TokensFlexItem>
            <TokensFlexItem component="span" grow={false}>
              <DraggableBadge
                contextId={contextId}
                eventId={id}
                field="registry.path"
                tooltipContent={registryPathTooltipContent}
                value={registryPath}
                isAggregatable={true}
                fieldType="keyword"
              />
            </TokensFlexItem>
          </>
        )}

        <TokensFlexItem component="span" grow={false}>
          {i18n.VIA}
        </TokensFlexItem>

        <TokensFlexItem component="span" grow={false}>
          <ProcessDraggableWithNonExistentProcess
            contextId={contextId}
            endgamePid={undefined}
            endgameProcessName={undefined}
            eventId={id}
            processPid={processPid}
            processName={processName}
            processExecutable={undefined}
          />
        </TokensFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const RegistryEventDetailsLine = React.memo(RegistryEventDetailsLineComponent);
