/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { useUnregisterFields } from '../../hooks/use_unregister_fields';
import { MAX_WIDTH } from '../../constants';
import { useSloFormContext } from '../slo_form_context';
import { IndicatorTypeSelect } from './indicator_type_select';
import { useIndicatorSectionState } from './use_indicator_section_state';

export function ClassicIndicatorSection() {
  const { isEditMode } = useSloFormContext();
  useUnregisterFields({ isEditMode });

  const { filteredSliOptions, indicatorTypeForm } = useIndicatorSectionState();

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="sloEditFormIndicatorSection"
    >
      {!isEditMode && (
        <>
          <IndicatorTypeSelect options={filteredSliOptions} />
          <EuiSpacer size="xl" />
        </>
      )}
      {indicatorTypeForm}
    </EuiPanel>
  );
}
