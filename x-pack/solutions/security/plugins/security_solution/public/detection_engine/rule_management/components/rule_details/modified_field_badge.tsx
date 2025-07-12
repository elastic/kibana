/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as i18n from './translations';
import { useRuleCustomizationsContext } from './rule_customizations_diff/rule_customizations_context';
import { PrebuiltRuleDiffBadge } from './prebuilt_rule_diff_badge';

interface ModifiedFieldBadgeProps {
  fieldName: string;
}

export const ModifiedFieldBadge: React.FC<ModifiedFieldBadgeProps> = ({ fieldName }) => {
  const {
    state: { doesBaseVersionExist, modifiedFields },
  } = useRuleCustomizationsContext();

  if (!doesBaseVersionExist || !modifiedFields.has(fieldName)) {
    return null;
  }

  return (
    <PrebuiltRuleDiffBadge
      label={i18n.MODIFIED_PREBUILT_RULE_PER_FIELD_LABEL}
      dataTestSubj="modified-prebuilt-rule-per-field-badge"
    />
  );
};
