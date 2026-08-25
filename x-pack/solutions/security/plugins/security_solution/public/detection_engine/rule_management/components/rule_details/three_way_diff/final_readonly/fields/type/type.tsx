/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type { DiffableRuleTypes } from '../../../../../../../../../common/api/detection_engine';
import { RuleType } from '../../../../rule_definition_section';

interface TypeReadOnlyProps {
  type: DiffableRuleTypes;
}

export function TypeReadOnly({ type }: TypeReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: ruleDetailsI18n.RULE_TYPE_FIELD_LABEL,
          description: <RuleType type={type} />,
        },
      ]}
    />
  );
}
