/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UserItem } from '../../../../../common/search_strategy';
import { ObservedEntity } from '../../shared/components/observed_entity';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import { useObservedUserItems } from '../hooks/use_observed_user_items';

type ObservedUserData = Omit<ObservedEntityData<UserItem>, 'anomalies'>;

interface ObservedDataSectionProps {
  userName: string;
  observedUser: ObservedUserData;
  contextID: string;
  scopeId: string;
  queryId: string;
}

export const ObservedDataSection = ({
  observedUser,
  contextID,
  scopeId,
  queryId,
}: ObservedDataSectionProps) => {
  const observedFields = useObservedUserItems(observedUser);

  return (
    <ObservedEntity
      observedData={observedUser}
      contextID={contextID}
      scopeId={scopeId}
      observedFields={observedFields}
      queryId={queryId}
    />
  );
};
