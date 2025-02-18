/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { InvestigationFields } from '../../../../../../../../../common/api/detection_engine';
import { InvestigationFields as InvestigationFieldsComponent } from '../../../../rule_about_section';
import { EmptyFieldValuePlaceholder } from '../../empty_field_value_placeholder';

interface InvestigationFieldsReadOnlyProps {
  investigationFields?: InvestigationFields;
}

export function InvestigationFieldsReadOnly({
  investigationFields,
}: InvestigationFieldsReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.INVESTIGATION_FIELDS_FIELD_LABEL,
          description:
            investigationFields && investigationFields.field_names.length ? (
              <InvestigationFieldsComponent investigationFields={investigationFields.field_names} />
            ) : (
              <EmptyFieldValuePlaceholder />
            ),
        },
      ]}
    />
  );
}
