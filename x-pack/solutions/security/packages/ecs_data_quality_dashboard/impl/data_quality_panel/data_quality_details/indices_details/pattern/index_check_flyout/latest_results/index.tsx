/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiSpacer } from '@elastic/eui';
import { IlmExplainLifecycleLifecycleExplain } from '@elastic/elasticsearch/lib/api/types';
import { getDocsCount, getSizeInBytes } from '../../../../../utils/stats';
import { getIlmPhase } from '../../../../../utils/get_ilm_phase';
import { ErrorEmptyPrompt } from '../../error_empty_prompt';
import { LoadingEmptyPrompt } from '../../loading_empty_prompt';
import type { MeteringStatsIndex, PatternRollup } from '../../../../../types';
import { useIndicesCheckContext } from '../../../../../contexts/indices_check_context';
import { LatestCheckFields } from './latest_check_fields';
import { IndexStatsPanel } from '../index_stats_panel';
import { useDataQualityContext } from '../../../../../data_quality_context';
import {
  CHECKING_INDEX,
  ERROR_GENERIC_CHECK_TITLE,
  ERROR_LOADING_MAPPINGS_TITLE,
  ERROR_LOADING_UNALLOWED_VALUES_TITLE,
  LOADING_MAPPINGS,
  LOADING_UNALLOWED_VALUES,
} from '../translations';

export interface Props {
  ilmExplain: Record<string, IlmExplainLifecycleLifecycleExplain> | null;
  indexName: string;
  patternRollup: PatternRollup | undefined;
  stats: Record<string, MeteringStatsIndex> | null;
}

const LatestResultsComponent: React.FC<Props> = ({
  indexName,
  patternRollup,
  stats,
  ilmExplain,
}) => {
  const { isILMAvailable } = useDataQualityContext();
  const docsCount = useMemo(() => getDocsCount({ stats, indexName }), [stats, indexName]);
  const sizeInBytes = useMemo(() => getSizeInBytes({ stats, indexName }), [indexName, stats]);
  const ilmPhase = useMemo(() => {
    return isILMAvailable && ilmExplain != null
      ? getIlmPhase(ilmExplain?.[indexName], isILMAvailable)
      : undefined;
  }, [ilmExplain, indexName, isILMAvailable]);

  const { checkState } = useIndicesCheckContext();
  const indexCheckState = checkState[indexName];
  const isChecking = indexCheckState?.isChecking ?? false;
  const isLoadingMappings = indexCheckState?.isLoadingMappings ?? false;
  const isLoadingUnallowedValues = indexCheckState?.isLoadingUnallowedValues ?? false;
  const genericCheckError = indexCheckState?.genericError ?? null;
  const mappingsError = indexCheckState?.mappingsError ?? null;
  const unallowedValuesError = indexCheckState?.unallowedValuesError ?? null;
  const isCheckComplete = indexCheckState?.isCheckComplete ?? false;

  if (mappingsError != null) {
    return <ErrorEmptyPrompt title={ERROR_LOADING_MAPPINGS_TITLE} />;
  } else if (unallowedValuesError != null) {
    return <ErrorEmptyPrompt title={ERROR_LOADING_UNALLOWED_VALUES_TITLE} />;
  } else if (genericCheckError != null) {
    return <ErrorEmptyPrompt title={ERROR_GENERIC_CHECK_TITLE} />;
  }

  if (isLoadingMappings) {
    return <LoadingEmptyPrompt loading={LOADING_MAPPINGS} />;
  } else if (isLoadingUnallowedValues) {
    return <LoadingEmptyPrompt loading={LOADING_UNALLOWED_VALUES} />;
  } else if (isChecking) {
    return <LoadingEmptyPrompt loading={CHECKING_INDEX} />;
  }

  return isCheckComplete ? (
    <div data-test-subj="latestResults">
      <IndexStatsPanel docsCount={docsCount} sizeInBytes={sizeInBytes ?? 0} ilmPhase={ilmPhase} />
      <EuiSpacer />
      <LatestCheckFields
        docsCount={docsCount}
        ilmPhase={ilmPhase}
        indexName={indexName}
        patternRollup={patternRollup}
      />
    </div>
  ) : null;
};

LatestResultsComponent.displayName = 'LatestResultsComponent';

export const LatestResults = React.memo(LatestResultsComponent);
