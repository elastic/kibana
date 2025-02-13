/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { RuleNameOverrideObject } from '../../../../../../../../../common/api/detection_engine';
import { RuleNameOverride } from '../../../../rule_about_section';
import { EmptyFieldValuePlaceholder } from '../../empty_field_value_placeholder';

interface RuleNameOverrideReadOnlyProps {
  ruleNameOverride?: RuleNameOverrideObject;
}

export function RuleNameOverrideReadOnly({ ruleNameOverride }: RuleNameOverrideReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.RULE_NAME_OVERRIDE_FIELD_LABEL,
          description: ruleNameOverride?.field_name ? (
            <RuleNameOverride ruleNameOverride={ruleNameOverride.field_name} />
          ) : (
            <EmptyFieldValuePlaceholder />
          ),
        },
      ]}
    />
  );
}
