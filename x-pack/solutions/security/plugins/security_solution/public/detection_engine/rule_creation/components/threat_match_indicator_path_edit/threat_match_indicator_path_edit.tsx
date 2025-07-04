/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { FieldConfig } from '../../../../shared_imports';
import { fieldValidators, UseField, VALIDATION_TYPES } from '../../../../shared_imports';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';
import { OptionalFieldLabel } from '../optional_field_label';
import * as i18n from './translations';

interface ThreatMatchIndicatorPathEditProps {
  path: string;
  disabled?: boolean;
}

export const ThreatMatchIndicatorPathEdit = memo(function ThreatMatchIndicatorPathEdit({
  path,
  disabled,
}: ThreatMatchIndicatorPathEditProps): JSX.Element {
  return (
    <UseField
      path={path}
      component={TextField}
      config={THREAT_MATCH_INDICATOR_PATH_FIELD_CONFIG}
      componentProps={{
        idAria: 'ruleThreatMatchIndicatorPath',
        'data-test-subj': 'ruleThreatMatchIndicatorPath',
        euiFieldProps: {
          fullWidth: true,
          disabled,
          placeholder: DEFAULT_INDICATOR_SOURCE_PATH,
        },
      }}
    />
  );
});

const THREAT_MATCH_INDICATOR_PATH_FIELD_CONFIG: FieldConfig<string[]> = {
  label: i18n.THREAT_MATCH_INDICATOR_PATH_FIELD_LABEL,
  helpText: i18n.THREAT_MATCH_INDICATOR_PATH_FIELD_HELP_TEXT,
  labelAppend: OptionalFieldLabel,
  validations: [
    {
      validator: fieldValidators.emptyField(
        i18n.THREAT_MATCH_INDICATOR_PATH_FIELD_VALIDATION_REQUIRED_ERROR
      ),
      type: VALIDATION_TYPES.FIELD,
    },
  ],
};
