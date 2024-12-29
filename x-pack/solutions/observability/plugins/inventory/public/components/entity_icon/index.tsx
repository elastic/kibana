/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type CloudProvider, CloudProviderIcon, AgentIcon } from '@kbn/custom-icons';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { castArray } from 'lodash';
import type { InventoryEntity } from '../../../common/entities';
import { isBuiltinEntityOfType } from '../../../common/utils/entity_type_guards';

interface EntityIconProps {
  entity: InventoryEntity;
}

export function EntityIcon({ entity }: EntityIconProps) {
  const defaultIconSize = euiThemeVars.euiSizeL;

  if (isBuiltinEntityOfType('host', entity) || isBuiltinEntityOfType('container', entity)) {
    const cloudProvider = castArray(entity.cloud?.provider)[0];

    return (
      <EuiFlexGroup
        style={{ width: defaultIconSize, height: defaultIconSize }}
        alignItems="center"
        justifyContent="center"
      >
        <EuiFlexItem grow={false}>
          <CloudProviderIcon
            cloudProvider={cloudProvider as CloudProvider | undefined}
            size="m"
            title={cloudProvider}
            role="presentation"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isBuiltinEntityOfType('service', entity)) {
    return <AgentIcon agentName={castArray(entity.agent?.name)[0]} role="presentation" />;
  }

  if (entity.entityType.startsWith('k8s')) {
    return <EuiIcon type="logoKubernetes" size="l" />;
  }

  // Return an empty EuiIcon instead of null to maintain UI alignment across all EntityIcon usages
  return <EuiIcon type="" size="l" />;
}
