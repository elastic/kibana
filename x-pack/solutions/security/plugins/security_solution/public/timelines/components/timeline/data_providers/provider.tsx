/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash/fp';
import React, { useState } from 'react';

import type { DataProvider } from './data_provider';
import { IS_OPERATOR } from './data_provider';
import { ProviderItemBadge } from './provider_item_badge';
import { DataProviderTypeEnum } from '../../../../../common/api/timeline';

interface OwnProps {
  dataProvider: DataProvider;
}

export const Provider = React.memo<OwnProps>(({ dataProvider }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <ProviderItemBadge
      deleteProvider={noop}
      field={dataProvider.queryMatch.displayField || dataProvider.queryMatch.field}
      kqlQuery={dataProvider.kqlQuery}
      isEnabled={dataProvider.enabled}
      isExcluded={dataProvider.excluded}
      providerId={dataProvider.id}
      isPopoverOpen={isPopoverOpen}
      setIsPopoverOpen={setIsPopoverOpen}
      toggleExcludedProvider={noop}
      toggleEnabledProvider={noop}
      toggleTypeProvider={noop}
      displayValue={String(dataProvider.queryMatch.displayValue ?? dataProvider.queryMatch.value)}
      val={dataProvider.queryMatch.value}
      operator={dataProvider.queryMatch.operator || IS_OPERATOR}
      type={dataProvider.type || DataProviderTypeEnum.default}
    />
  );
});

Provider.displayName = 'Provider';
