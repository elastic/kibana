/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { requiredOptional } from '@kbn/zod-helpers';
import { EuiDescriptionList } from '@elastic/eui';
import type { RiskScoreMapping } from '../../../../../../../../../common/api/detection_engine';
import * as ruleDetailsI18n from '../../../../translations';
import { RiskScoreMappingItem } from '../../../../rule_about_section';
import { EmptyFieldValuePlaceholder } from '../../empty_field_value_placeholder';

export interface RiskScoreMappingReadProps {
  riskScoreMapping: RiskScoreMapping;
}

export const RiskScoreMappingReadOnly = ({ riskScoreMapping }: RiskScoreMappingReadProps) => {
  const nonEmptyRiskScoreMappingItems = riskScoreMapping.filter(
    (riskScoreMappingItem) => riskScoreMappingItem.field !== ''
  );

  if (nonEmptyRiskScoreMappingItems.length === 0) {
    return (
      <EuiDescriptionList
        listItems={[
          {
            title: ruleDetailsI18n.RISK_SCORE_MAPPING_FIELD_LABEL,
            description: <EmptyFieldValuePlaceholder />,
          },
        ]}
      />
    );
  }

  const listItems = nonEmptyRiskScoreMappingItems.map((riskScoreMappingItem, index) => ({
    title: index === 0 ? ruleDetailsI18n.RISK_SCORE_MAPPING_FIELD_LABEL : '',
    description: (
      <RiskScoreMappingItem riskScoreMappingItem={requiredOptional(riskScoreMappingItem)} />
    ),
  }));

  return <EuiDescriptionList listItems={listItems} />;
};
