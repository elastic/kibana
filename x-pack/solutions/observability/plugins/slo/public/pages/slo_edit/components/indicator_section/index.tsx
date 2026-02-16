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
import { MAX_WIDTH } from '../../constants';
import { useSloFormContext, useIsHorizontalLayout } from '../slo_form_context';
import { IndicatorTypeSelect } from './indicator_type_select';
import { useIndicatorSectionState } from './use_indicator_section_state';

export function IndicatorSection() {
  const { isEditMode } = useSloFormContext();
  const isHorizontalLayout = useIsHorizontalLayout();
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
      hasBorder={isHorizontalLayout}
      hasShadow={false}
      paddingSize="none"
      style={isHorizontalLayout ? undefined : { maxWidth: MAX_WIDTH }}
      data-test-subj="sloEditFormIndicatorSection"
    >
      {isHorizontalLayout && (
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
      )}
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize={isHorizontalLayout ? 'm' : 'none'}>
        {!isEditMode && (
          <>
            <IndicatorTypeSelect options={filteredSliOptions} />
            <EuiSpacer size={isHorizontalLayout ? 'm' : 'xl'} />
          </>
        )}
        {indicatorTypeForm}
      </EuiPanel>
    </EuiPanel>
  );
}
