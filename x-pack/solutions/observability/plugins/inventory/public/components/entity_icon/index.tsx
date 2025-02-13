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
import { BUILT_IN_ENTITY_TYPES } from '@kbn/observability-shared-plugin/common';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { InventoryEntity } from '../../../common/entities';
import { isBuiltinEntityOfType } from '../../../common/utils/check_entity_type';

interface EntityIconProps {
  entity: InventoryEntity;
}

export function EntityIcon({ entity }: EntityIconProps) {
  const defaultIconSize = euiThemeVars.euiSizeL;

  if (
    isBuiltinEntityOfType(BUILT_IN_ENTITY_TYPES.HOST_V2, entity) ||
    isBuiltinEntityOfType(BUILT_IN_ENTITY_TYPES.CONTAINER_V2, entity)
  ) {
    const cloudProvider = castArray(entity['cloud.provider'] as string)[0];

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

  if (isBuiltinEntityOfType(BUILT_IN_ENTITY_TYPES.SERVICE_V2, entity)) {
    return (
      <AgentIcon agentName={castArray(entity['agent.name'] as AgentName)[0]} role="presentation" />
    );
  }

  if (entity.entityType.startsWith('k8s')) {
    return <EuiIcon type="logoKubernetes" size="l" />;
  }

  // Return an empty EuiIcon instead of null to maintain UI alignment across all EntityIcon usages
  return <EuiIcon type="" size="l" />;
}
