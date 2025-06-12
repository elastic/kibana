/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  UtilityBar,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../../../../common/components/utility_bar';
import * as i18n from './translations';

interface RuleUpgradeInfoBarProps {
  totalNumOfFields: number;
  numOfFieldsWithUpdates: number;
  numOfConflicts: number;
  currentVersionNumber: number;
  targetVersionNumber: number;
}

export function RuleUpgradeInfoBar({
  totalNumOfFields,
  numOfFieldsWithUpdates,
  numOfConflicts,
  currentVersionNumber,
  targetVersionNumber,
}: RuleUpgradeInfoBarProps): JSX.Element {
  return (
    <UtilityBar>
      <UtilityBarSection>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingRules">
            {i18n.VERSION_UPDATE_INFO(
              numOfFieldsWithUpdates,
              currentVersionNumber,
              targetVersionNumber
            )}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingRules">
            {i18n.TOTAL_NUM_OF_FIELDS(totalNumOfFields)}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingRules">
            {i18n.NUM_OF_CONFLICTS(numOfConflicts)}
          </UtilityBarText>
        </UtilityBarGroup>
      </UtilityBarSection>
      <UtilityBarSection>
        <UtilityBarGroup>
          <i18n.RuleUpgradeHelper />
        </UtilityBarGroup>
      </UtilityBarSection>
    </UtilityBar>
  );
}
