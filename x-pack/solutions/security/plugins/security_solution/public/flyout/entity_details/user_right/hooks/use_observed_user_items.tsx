/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { UserItem } from '../../../../../common/search_strategy';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { getAnomaliesFields } from '../../shared/common';
import * as i18n from './translations';
import type { ObservedEntityData } from '../../shared/components/observed_entity/types';
import type { EntityTableRows } from '../../shared/components/entity_table/types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';

const basicUserFields: EntityTableRows<ObservedEntityData<UserItem>> = [
  {
    label: i18n.USER_ID,
    getValues: (userData: ObservedEntityData<UserItem>) => userData.details.user?.id,
    field: 'user.id',
  },
  {
    label: 'Domain',
    getValues: (userData: ObservedEntityData<UserItem>) => userData.details.user?.domain,
    field: 'user.domain',
  },
  {
    label: i18n.FIRST_SEEN,
    render: (userData: ObservedEntityData<UserItem>) =>
      userData.firstSeen.date ? (
        <FormattedRelativePreferenceDate value={userData.firstSeen.date} />
      ) : (
        getEmptyTagValue()
      ),
  },
  {
    label: i18n.LAST_SEEN,
    render: (userData: ObservedEntityData<UserItem>) =>
      userData.lastSeen.date ? (
        <FormattedRelativePreferenceDate value={userData.lastSeen.date} />
      ) : (
        getEmptyTagValue()
      ),
  },
  {
    label: i18n.OPERATING_SYSTEM_TITLE,
    getValues: (userData: ObservedEntityData<UserItem>) => userData.details.host?.os?.name,
    field: 'host.os.name',
  },
  {
    label: i18n.FAMILY,
    getValues: (userData: ObservedEntityData<UserItem>) => userData.details.host?.os?.family,
    field: 'host.os.family',
  },
  {
    label: i18n.IP_ADDRESSES,
    getValues: (userData: ObservedEntityData<UserItem>) => userData.details.host?.ip,
    field: 'host.ip',
  },
];

export const useObservedUserItems = (
  userData: ObservedEntityData<UserItem>
): EntityTableRows<ObservedEntityData<UserItem>> => {
  const mlCapabilities = useMlCapabilities();

  const fields: EntityTableRows<ObservedEntityData<UserItem>> = useMemo(
    () => [...basicUserFields, ...getAnomaliesFields(mlCapabilities)],
    [mlCapabilities]
  );

  if (!userData.details) {
    return [];
  }

  return fields;
};
