/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiColorPicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Controller, useFormContext } from 'react-hook-form';
import { IconSelect, LineStyleSettings } from '@kbn/visualization-ui-components';
import React from 'react';
import { Select } from './components/forward_refs';
import { TextDecoration } from './components/text_decoration';
import { Annotation } from '../../../common/annotations';
import { FillOptions } from './components/fill_option';
import { iconsSet } from './icon_set';

export function AnnotationAppearance() {
  const { control, watch } = useFormContext<Annotation>();

  const eventEnd = watch('event.end');

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.observability.annotationForm.euiFormRow.appearance', {
            defaultMessage: 'Appearance',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {eventEnd ? (
        <FillOptions />
      ) : (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.observability.annotationForm.euiFormRow.markerIconLabel', {
              defaultMessage: 'Icon decoration',
            })}
            display="columnCompressed"
            fullWidth
          >
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem>
                <Controller
                  name="annotation.style.icon"
                  control={control}
                  render={({ field }) => (
                    <IconSelect
                      onChange={field.onChange}
                      customIconSet={iconsSet}
                      value={field.value}
                    />
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <Controller
                  name="annotation.style.line.iconPosition"
                  control={control}
                  render={({ field }) => (
                    <Select
                      compressed
                      data-test-subj="o11yAnnotationAppearanceSelect"
                      {...field}
                      options={[
                        { value: 'top', text: 'Top' },
                        { value: 'bottom', text: 'Bottom' },
                      ]}
                    />
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
          <TextDecoration />
          <Controller
            name="annotation.style.line"
            control={control}
            render={({ field, fieldState }) => (
              <LineStyleSettings
                currentConfig={{
                  lineStyle: field.value?.style,
                  lineWidth: field.value?.width,
                }}
                setConfig={(newVal) => {
                  field.onChange({
                    ...field.value,
                    style: newVal.lineStyle,
                    width: newVal.lineWidth,
                  });
                }}
                idPrefix="o11yAnnotations"
              />
            )}
          />
        </>
      )}

      <EuiFormRow
        label={i18n.translate(
          'xpack.observability.annotationForm.euiFormRow.lineStrokeColorLabel',
          { defaultMessage: 'Color' }
        )}
        display="columnCompressed"
        fullWidth
      >
        <Controller
          name="annotation.style.color"
          control={control}
          render={({ field: { ref, ...field } }) => (
            <EuiColorPicker {...field} color={field.value} compressed showAlpha={true} />
          )}
        />
      </EuiFormRow>
    </>
  );
}
