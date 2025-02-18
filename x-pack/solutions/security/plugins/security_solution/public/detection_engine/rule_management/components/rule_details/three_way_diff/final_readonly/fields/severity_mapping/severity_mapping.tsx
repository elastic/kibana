/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { SeverityMapping } from '../../../../../../../../../common/api/detection_engine';
import * as ruleDetailsI18n from '../../../../translations';
import { SeverityMappingItem } from '../../../../rule_about_section';
import { EmptyFieldValuePlaceholder } from '../../empty_field_value_placeholder';

export interface SeverityMappingReadOnlyProps {
  severityMapping: SeverityMapping;
}

export const SeverityMappingReadOnly = ({ severityMapping }: SeverityMappingReadOnlyProps) => {
  const nonEmptySeverityMappingItems = severityMapping.filter(
    (severityMappingItem) => severityMappingItem.field !== ''
  );

  if (nonEmptySeverityMappingItems.length === 0) {
    return (
      <EuiDescriptionList
        listItems={[
          {
            title: ruleDetailsI18n.SEVERITY_MAPPING_FIELD_LABEL,
            description: <EmptyFieldValuePlaceholder />,
          },
        ]}
      />
    );
  }

  const listItems = nonEmptySeverityMappingItems.map((severityMappingItem, index) => ({
    title: index === 0 ? ruleDetailsI18n.SEVERITY_MAPPING_FIELD_LABEL : '',
    description: <SeverityMappingItem severityMappingItem={severityMappingItem} />,
  }));

  return <EuiDescriptionList listItems={listItems} />;
};
