/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import { ThreatIndicatorPath } from '../../../../rule_about_section';

export interface ThreatIndicatorPathReadOnlyProps {
  threatIndicatorPath?: string;
}

export const ThreatIndicatorPathReadOnly = ({
  threatIndicatorPath,
}: ThreatIndicatorPathReadOnlyProps) => {
  if (!threatIndicatorPath) {
    return null;
  }

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.THREAT_INDEX_FIELD_LABEL,
          description: <ThreatIndicatorPath threatIndicatorPath={threatIndicatorPath} />,
        },
      ]}
    />
  );
};
