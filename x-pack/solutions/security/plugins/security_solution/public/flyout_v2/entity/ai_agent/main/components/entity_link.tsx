/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import { useFlyoutApi } from '../../../../use_flyout_api';
import type { RelatedEntity } from '../../../../../entity_analytics/components/ai_security/types';

export type OpenRelatedEntity = (row: RelatedEntity) => void;

const getEntityName = ({ engineType, hostName, userName, name }: RelatedEntity) => {
  if (engineType === 'host') return hostName ?? name;
  if (engineType === 'user') return userName ?? name;
  return name;
};

/** Opens a related host, user or agent row in its own flyout, as a child of the agent flyout. */
export const useOpenRelatedEntity = (scopeId: string): OpenRelatedEntity => {
  const { openEntityDetailsAsChild } = useFlyoutApi();
  return useCallback(
    (row: RelatedEntity) =>
      openEntityDetailsAsChild({
        engineType: row.engineType,
        entityId: row.entityId,
        entityName: getEntityName(row),
        scopeId,
        origin: FLYOUT_ORIGIN.ENTITIES_LIST,
      }),
    [openEntityDetailsAsChild, scopeId]
  );
};

export const EntityLink = ({
  row,
  label,
  onOpen,
}: {
  readonly row: RelatedEntity;
  readonly label: string;
  readonly onOpen: OpenRelatedEntity;
}) => <EuiLink onClick={() => onOpen(row)}>{label}</EuiLink>;
