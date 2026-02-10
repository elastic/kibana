/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { Direction, NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../common/search_strategy';
import { useFirstLastSeen } from '../../../../common/containers/use_first_last_seen';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';
import { sourcererSelectors } from '../../../../sourcerer/store';

export const useObservedHostHeaderLastSeen = (
  hostName: string,
  scopeId: string
): string | null | undefined => {
  const globalTime = useGlobalTime();
  const { isInitializing } = globalTime;

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const oldSecurityDefaultPatterns =
    useSelector(sourcererSelectors.defaultDataView)?.patternList ?? [];
  const { indexPatterns: experimentalSecurityDefaultIndexPatterns } = useSecurityDefaultPatterns();
  const securityDefaultPatterns = newDataViewPickerEnabled
    ? experimentalSecurityDefaultIndexPatterns
    : oldSecurityDefaultPatterns;

  const [, { lastSeen }] = useFirstLastSeen({
    field: 'host.name',
    value: hostName,
    defaultIndex: securityDefaultPatterns,
    order: Direction.desc,
    filterQuery: NOT_EVENT_KIND_ASSET_FILTER,
  });

  return isInitializing ? undefined : lastSeen ?? undefined;
};
