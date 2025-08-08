/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { IlmPhasesEmptyPrompt } from './ilm_phases_empty_prompt';
import { IndicesDetails } from './indices_details';
import { StorageDetails } from './storage_details';
import { SelectedIndex } from '../types';
import { useDataQualityContext } from '../data_quality_context';

const DataQualityDetailsComponent: React.FC = () => {
  const { isILMAvailable, ilmPhases } = useDataQualityContext();
  const [chartSelectedIndex, setChartSelectedIndex] = useState<SelectedIndex | null>(null);

  const handleChartsIndexSelected = useCallback(async ({ indexName, pattern }: SelectedIndex) => {
    setChartSelectedIndex({ indexName, pattern });
  }, []);

  if (isILMAvailable && ilmPhases.length === 0) {
    return <IlmPhasesEmptyPrompt />;
  }

  return (
    <>
      <StorageDetails onIndexSelected={handleChartsIndexSelected} />
      <IndicesDetails
        chartSelectedIndex={chartSelectedIndex}
        setChartSelectedIndex={setChartSelectedIndex}
      />
    </>
  );
};

DataQualityDetailsComponent.displayName = 'DataQualityDetailsComponent';
export const DataQualityDetails = React.memo(DataQualityDetailsComponent);
