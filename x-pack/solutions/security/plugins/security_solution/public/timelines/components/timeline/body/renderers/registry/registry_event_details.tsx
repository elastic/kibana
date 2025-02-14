/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import React from 'react';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { Details, isNillEmptyOrNotFinite } from '../helpers';

import { RegistryEventDetailsLine } from './registry_event_details_line';

interface Props {
  contextId: string;
  data: Ecs;
  text: string;
}

const RegistryEventDetailsComponent: React.FC<Props> = ({ contextId, data, text }) => {
  const hostName: string | null | undefined = get('host.name[0]', data);
  const id = data._id;
  const processName: string | null | undefined = get('process.name[0]', data);
  const processPid: number | null | undefined = get('process.pid[0]', data);
  const registryKey: string | null | undefined = get('registry.key[0]', data);
  const registryPath: string | null | undefined = get('registry.path[0]', data);
  const userDomain: string | null | undefined = get('user.domain[0]', data);
  const userName: string | null | undefined = get('user.name[0]', data);

  if (isNillEmptyOrNotFinite(registryKey)) {
    return null;
  }

  return (
    <Details>
      <RegistryEventDetailsLine
        contextId={contextId}
        hostName={hostName}
        id={id}
        processName={processName}
        processPid={processPid}
        registryKey={registryKey}
        registryPath={registryPath}
        text={text}
        userDomain={userDomain}
        userName={userName}
      />
    </Details>
  );
};

RegistryEventDetailsComponent.displayName = 'RegistryEventDetailsComponent';

export const RegistryEventDetails = React.memo(RegistryEventDetailsComponent);
