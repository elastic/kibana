/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useInterval from 'react-use/lib/useInterval';

import React, { useState } from 'react';
import { difference } from 'lodash';
import { YourTrialCompanion } from './nba_get_setup_panel';
import { useKibana } from '../common/lib/kibana';
import { useGetNBA } from './hooks/use_get_nba';
import { NBA_TODO_LIST, type NBATODOItem } from './nba_translations';
import { useIsExperimentalFeatureEnabled } from '../common/hooks/use_experimental_features';
import type { Milestone } from '../../common/trial_companion/types';
import { useProductFeatureKeys } from '../common/hooks/use_product_feature_keys';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props {}

export const TrialCompanion: React.FC<Props> = () => {
  const { cloud } = useKibana().services;
  const trialCompanionEnabled = useIsExperimentalFeatureEnabled('trialCompanionEnabled');
  if (!cloud?.isInTrial() || !trialCompanionEnabled) {
    return null;
  }
  return <TrialCompanionImpl />;
};

const defaultTimeout = 10000;

export function sameArrays(first: Milestone[], second: Milestone[]): boolean {
  return difference(first, second).length === 0 && difference(second, first).length === 0;
}

export function filterAvailableTODOs(
  config: NBATODOItem[],
  productFeatureKeys: Set<string>
): NBATODOItem[] {
  return config.filter(
    (item) => !item.features || item.features.every((k) => productFeatureKeys.has(k))
  );
}

const TrialCompanionImpl: React.FC<Props> = () => {
  const [count, setCount] = useState(0);
  const [previouslyLoaded, setPreviouslyLoaded] = useState<Milestone[] | undefined>(undefined);
  const response = useGetNBA([count]);
  const productFeatureKeys = useProductFeatureKeys();
  const value = response?.value;
  const openTODOs = value?.openTODOs;
  const loading = response?.loading;
  const dismiss = value?.dismiss;
  const todoItems = filterAvailableTODOs(NBA_TODO_LIST, productFeatureKeys);

  useInterval(() => {
    if (response?.error || loading || (openTODOs && !dismiss)) {
      setCount((c) => c + 1);
    }
  }, defaultTimeout);

  let result = previouslyLoaded;
  if (!loading && openTODOs) {
    result = openTODOs;
    if (!previouslyLoaded || !sameArrays(result, previouslyLoaded)) {
      setPreviouslyLoaded(result);
    }
  }

  if (!result || dismiss) return null;

  return <YourTrialCompanion open={result} todoItems={todoItems} />;
};
