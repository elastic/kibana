/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HostItem } from '../../../../../common/search_strategy';
import { ObservedEntity } from '../../shared/components/observed_entity';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { useObservedHostFields } from '../hooks/use_observed_host_fields';

type ObservedHostData = Omit<ObservedEntityData<HostItem>, 'anomalies'>;

interface ObservedDataSectionProps {
  observedHost: ObservedHostData;
  contextID: string;
  scopeId: string;
  queryId: string;
}

export const ObservedDataSection = ({
  observedHost,
  contextID,
  scopeId,
  queryId,
}: ObservedDataSectionProps) => {
  const observedFields = useObservedHostFields(observedHost);

  return (
    <ObservedEntity
      observedData={observedHost}
      contextID={contextID}
      scopeId={scopeId}
      observedFields={observedFields}
      queryId={queryId}
    />
  );
};
