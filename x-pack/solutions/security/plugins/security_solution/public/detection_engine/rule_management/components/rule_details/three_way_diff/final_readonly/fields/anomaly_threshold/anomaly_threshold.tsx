/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { AnomalyThreshold as AnomalyThresholdType } from '../../../../../../../../../common/api/detection_engine';
import { AnomalyThreshold } from '../../../../rule_definition_section';

interface TagsReadOnlyProps {
  anomalyThreshold: AnomalyThresholdType;
}

export function AnomalyThresholdReadOnly({ anomalyThreshold }: TagsReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.ANOMALY_THRESHOLD_FIELD_LABEL,
          description: <AnomalyThreshold anomalyThreshold={anomalyThreshold} />,
        },
      ]}
    />
  );
}
