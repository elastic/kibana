/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { ThreatMapEntries } from '../../../../common/components/threat_match/types';
import type { FieldConfig } from '../../../../shared_imports';
import { UseField } from '../../../../shared_imports';
import { threatMatchMappingValidatorFactory } from './validators/threat_match_mapping_validator_factory';
import { ThreatMatchMappingField } from './threat_match_mapping_field';
import * as i18n from './translations';

interface ThreatMatchMappingEditProps {
  path: string;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
}

export const ThreatMatchMappingEdit = memo(function ThreatMatchMappingEdit({
  path,
  indexPatterns,
  threatIndexPatterns,
}: ThreatMatchMappingEditProps): JSX.Element {
  const fieldConfig: FieldConfig<ThreatMapEntries[]> = useMemo(
    () => ({
      label: i18n.THREAT_MATCH_MAPPING_FIELD_LABEL,
      validations: [
        {
          validator: threatMatchMappingValidatorFactory({
            indexPatterns,
            threatIndexPatterns,
          }),
        },
      ],
    }),
    [indexPatterns, threatIndexPatterns]
  );

  return (
    <UseField
      path={path}
      config={fieldConfig}
      component={ThreatMatchMappingField}
      componentProps={{
        indexPatterns,
        threatIndexPatterns,
      }}
    />
  );
});
