/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { Severity } from '../../../../../../../../../common/api/detection_engine';
import { SeverityBadge } from '../../../../../../../../common/components/severity_badge';

interface SeverityReadOnlyProps {
  severity: Severity;
}

export function SeverityReadOnly({ severity }: SeverityReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.SEVERITY_FIELD_LABEL,
          description: <SeverityBadge value={severity} />,
        },
      ]}
    />
  );
}
