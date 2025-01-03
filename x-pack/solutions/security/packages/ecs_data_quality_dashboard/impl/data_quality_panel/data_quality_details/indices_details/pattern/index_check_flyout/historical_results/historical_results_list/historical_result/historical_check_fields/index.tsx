/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { NonLegacyHistoricalResult } from '../../../../../../../../types';
import { getIncompatibleStatBadgeColor } from '../../../../../../../../utils/get_incompatible_stat_badge_color';
import { INCOMPATIBLE_FIELDS, SAME_FAMILY } from '../../../../../../../../translations';
import { INCOMPATIBLE_TAB_ID, SAME_FAMILY_TAB_ID } from '../../../../constants';
import { getIncompatibleAndSameFamilyFieldsFromHistoricalResult } from './utils/get_incompatible_and_same_family_fields_from_historical_result';
import { IncompatibleTab } from '../../../../incompatible_tab';
import { SameFamilyTab } from '../../../../same_family_tab';
import { CheckFieldsTabs } from '../../../../check_fields_tabs';
import { StyledHistoricalResultsCheckFieldsButtonGroup } from '../styles';

export interface Props {
  indexName: string;
  historicalResult: NonLegacyHistoricalResult;
}

const HistoricalCheckFieldsComponent: React.FC<Props> = ({ indexName, historicalResult }) => {
  const { incompatibleMappingsFields, incompatibleValuesFields, sameFamilyFields } =
    getIncompatibleAndSameFamilyFieldsFromHistoricalResult(historicalResult);

  const {
    docsCount,
    ilmPhase,
    sizeInBytes,
    incompatibleFieldCount,
    sameFamilyFieldCount,
    ecsFieldCount,
    customFieldCount,
    totalFieldCount,
  } = historicalResult;

  const tabs = useMemo(
    () => [
      {
        id: INCOMPATIBLE_TAB_ID,
        name: INCOMPATIBLE_FIELDS,
        badgeColor: getIncompatibleStatBadgeColor(incompatibleFieldCount),
        badgeCount: incompatibleFieldCount,
        content: (
          <IncompatibleTab
            docsCount={docsCount}
            ilmPhase={ilmPhase}
            indexName={indexName}
            incompatibleMappingsFields={incompatibleMappingsFields}
            incompatibleValuesFields={incompatibleValuesFields}
            sameFamilyFieldsCount={sameFamilyFieldCount}
            ecsCompliantFieldsCount={ecsFieldCount}
            customFieldsCount={customFieldCount}
            allFieldsCount={totalFieldCount}
            sizeInBytes={sizeInBytes}
            hasStickyActions={false}
          />
        ),
      },
      {
        id: SAME_FAMILY_TAB_ID,
        name: SAME_FAMILY,
        badgeColor: getIncompatibleStatBadgeColor(sameFamilyFieldCount),
        badgeCount: sameFamilyFieldCount,
        content: (
          <SameFamilyTab
            docsCount={docsCount}
            ilmPhase={ilmPhase}
            indexName={indexName}
            sameFamilyFields={sameFamilyFields}
            incompatibleFieldsCount={incompatibleFieldCount}
            ecsCompliantFieldsCount={ecsFieldCount}
            customFieldsCount={customFieldCount}
            allFieldsCount={totalFieldCount}
            sizeInBytes={sizeInBytes}
            hasStickyActions={false}
          />
        ),
      },
    ],
    [
      customFieldCount,
      docsCount,
      ecsFieldCount,
      ilmPhase,
      incompatibleFieldCount,
      incompatibleMappingsFields,
      incompatibleValuesFields,
      indexName,
      sameFamilyFieldCount,
      sameFamilyFields,
      sizeInBytes,
      totalFieldCount,
    ]
  );

  return (
    <div data-test-subj="historicalCheckFields">
      <CheckFieldsTabs
        tabs={tabs}
        renderButtonGroup={(props) => <StyledHistoricalResultsCheckFieldsButtonGroup {...props} />}
      />
    </div>
  );
};

HistoricalCheckFieldsComponent.displayName = 'HistoricalCheckFieldsComponent';

export const HistoricalCheckFields = React.memo(HistoricalCheckFieldsComponent);
