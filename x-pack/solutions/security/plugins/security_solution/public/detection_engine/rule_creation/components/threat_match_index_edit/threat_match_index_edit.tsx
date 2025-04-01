/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FieldConfig } from '../../../../shared_imports';
import { UseField } from '../../../../shared_imports';
import { ThreatMatchIndexSelectorField } from './threat_match_index_selector_field';
import { threatIndexPatternsRequiredValidator } from './validators/threat_index_patterns_required_validator';
import { forbiddenIndexPatternValidator } from './validators/forbidden_index_pattern_validator';

interface ThreatMatchIndexEditProps {
  path: string;
}

export function ThreatMatchIndexEdit({ path }: ThreatMatchIndexEditProps): JSX.Element {
  return (
    <UseField
      path={path}
      component={ThreatMatchIndexSelectorField}
      config={THREAT_MATCH_INDEX_FIELD_CONFIG}
    />
  );
}

const THREAT_MATCH_INDEX_FIELD_CONFIG: FieldConfig<string[]> = {
  validations: [
    {
      validator: threatIndexPatternsRequiredValidator,
    },
    {
      validator: forbiddenIndexPatternValidator,
    },
  ],
};
