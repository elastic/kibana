/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUnregisterFields } from '../../hooks/use_unregister_fields';
import { useSloFormContext } from '../slo_form_context';
import { IndicatorTypeSelect } from './indicator_type_select';
import { useIndicatorSectionState } from './use_indicator_section_state';

export function FlyoutIndicatorSection() {
  const { isEditMode } = useSloFormContext();
  useUnregisterFields({ isEditMode });

  const {
    documentationUrl,
    filteredSliOptions,
    indicatorTypeDescription,
    indicatorTypeForm,
    indicatorTypeLabel,
  } = useIndicatorSectionState();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj="sloEditFormIndicatorSection"
    >
      <EuiPanel color="subdued" hasBorder={false} hasShadow={false} paddingSize="m">
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h4>{indicatorTypeLabel}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{indicatorTypeDescription}</EuiText>
          </EuiFlexItem>
          {documentationUrl && (
            <EuiFlexItem grow={false}>
              <EuiLink
                data-test-subj="sloSloEditFormIndicatorSectionViewDocumentationButton"
                href={documentationUrl}
                target="_blank"
              >
                {i18n.translate('xpack.slo.sloEdit.flyout.viewDocumentation', {
                  defaultMessage: 'View documentation',
                })}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="m">
        {!isEditMode && (
          <>
            <IndicatorTypeSelect options={filteredSliOptions} />
            <EuiSpacer size="m" />
          </>
        )}
        {indicatorTypeForm}
      </EuiPanel>
    </EuiPanel>
  );
}
