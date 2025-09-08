/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ref } from 'react';
import React from 'react';
import { omit } from 'lodash';
import type { ControllerRenderProps } from 'react-hook-form';
import type {
  EuiFieldTextProps,
  EuiSelectProps,
  EuiFieldNumberProps,
  EuiFieldPasswordProps,
  EuiCheckboxProps,
  EuiSwitchProps,
  EuiButtonGroupProps,
  EuiComboBoxProps,
  EuiTextAreaProps,
} from '@elastic/eui';
import {
  EuiFieldText,
  EuiSelect,
  EuiFieldNumber,
  EuiFieldPassword,
  EuiCheckbox,
  EuiSwitch,
  EuiButtonGroup,
  EuiComboBox,
  EuiTextArea,
} from '@elastic/eui';
import type { MonitorSpacesProps } from '../fields/monitor_spaces';
import { MonitorSpaces } from '../fields/monitor_spaces';
import type { MaintenanceWindowsFieldProps } from '../fields/maintenance_windows/maintenance_windows';
import { MaintenanceWindowsField } from '../fields/maintenance_windows/maintenance_windows';
import type { ThrottlingConfigFieldProps } from '../fields/throttling/throttling_config_field';
import { ThrottlingConfigField } from '../fields/throttling/throttling_config_field';
import type { SourceFieldProps } from '../fields/source_field';
import { SourceField } from '../fields/source_field';
import type { FormattedComboBoxProps as DefaultFormattedComboBoxProps } from '../fields/combo_box';
import { FormattedComboBox as DefaultFormattedComboBox } from '../fields/combo_box';
import type { CodeEditorProps as DefaultCodeEditorProps } from '../fields/code_editor';
import { JSONEditor as DefaultJSONEditor } from '../fields/code_editor';
import type { MonitorTypeRadioGroupProps } from '../fields/monitor_type_radio_group';
import { MonitorTypeRadioGroup as DefaultMonitorTypeRadioGroup } from '../fields/monitor_type_radio_group';
import type { HeaderFieldProps as DefaultHeaderFieldProps } from '../fields/header_field';
import { HeaderField as DefaultHeaderField } from '../fields/header_field';
import type { KeyValuePairsFieldProps as DefaultKeyValuePairsFieldProps } from '../fields/key_value_field';
import { KeyValuePairsField as DefaultKeyValuePairsField } from '../fields/key_value_field';
import type { RequestBodyFieldProps as DefaultRequestBodyFieldProps } from '../fields/request_body_field';
import { RequestBodyField as DefaultRequestBodyField } from '../fields/request_body_field';
import type { ResponseBodyIndexFieldProps as DefaultResponseBodyIndexFieldProps } from '../fields/index_response_body_field';
import { ResponseBodyIndexField as DefaultResponseBodyIndexField } from '../fields/index_response_body_field';

// these props are automatically passed through to our controlled components
// they do not have to be defined specifically on the 'props' field in the
// `field_config` file
export type ControlledFieldProp = keyof ControllerRenderProps | 'defaultValue';

export type HeaderFieldProps = Omit<DefaultHeaderFieldProps, ControlledFieldProp>;
export type ResponseBodyIndexFieldProps = Omit<
  DefaultResponseBodyIndexFieldProps,
  ControlledFieldProp
>;
export type RequestBodyFieldProps = Omit<DefaultRequestBodyFieldProps, ControlledFieldProp>;
export type CodeEditorProps = Omit<DefaultCodeEditorProps, ControlledFieldProp>;
export type JSONCodeEditorProps = Omit<DefaultCodeEditorProps, ControlledFieldProp | 'languageId'>;
export type FormattedComboBoxProps = Omit<DefaultFormattedComboBoxProps, ControlledFieldProp>;

export const FieldText = React.forwardRef<HTMLInputElement, EuiFieldTextProps>(
  (props, ref: Ref<HTMLInputElement>) => (
    <EuiFieldText
      data-test-subj="syntheticsFieldTextFieldText"
      {...(omit(props, ['defaultValue', 'selectedOptions']) as EuiFieldTextProps)}
      inputRef={ref}
    />
  )
);

export const TextArea = React.forwardRef<HTMLTextAreaElement, EuiTextAreaProps>((props, ref) => (
  <EuiTextArea data-test-subj="syntheticsTextAreaTextArea" {...props} inputRef={ref} />
));

export const FieldNumber = React.forwardRef<HTMLInputElement, EuiFieldNumberProps>((props, ref) => (
  <EuiFieldNumber data-test-subj="syntheticsFieldNumberFieldNumber" {...props} inputRef={ref} />
));

export const FieldPassword = React.forwardRef<HTMLInputElement, EuiFieldPasswordProps>(
  (props, ref) => <EuiFieldPassword {...props} inputRef={ref} />
);

export const Checkbox = React.forwardRef<HTMLInputElement, EuiCheckboxProps>((props, _ref) => (
  <EuiCheckbox {...(omit(props, ['defaultValue', 'fullWidth', 'isInvalid']) as EuiCheckboxProps)} />
));

export const Select = React.forwardRef<HTMLSelectElement, EuiSelectProps>((props, ref) => (
  <EuiSelect data-test-subj="syntheticsSelectSelect" {...props} inputRef={ref} />
));

export const Switch = React.forwardRef<unknown, EuiSwitchProps>((props, _ref) => (
  <EuiSwitch {...(omit(props, ['fullWidth', 'isInvalid']) as EuiSwitchProps)} />
));

export const Source = React.forwardRef<unknown, SourceFieldProps>((props, _ref) => (
  <SourceField {...props} />
));

export const ButtonGroup = React.forwardRef<unknown, EuiButtonGroupProps>((props, _ref) => (
  <EuiButtonGroup {...(omit(props, ['isInvalid', 'fullWidth']) as EuiButtonGroupProps)} />
));

export const FormattedComboBox = React.forwardRef<unknown, DefaultFormattedComboBoxProps>(
  (props, _ref) => <DefaultFormattedComboBox {...props} />
);

export const ComboBox = React.forwardRef<unknown, EuiComboBoxProps<unknown>>((props, _ref) => (
  <EuiComboBox {...omit(props, ['isServiceManaged'])} />
));

export const JSONEditor = React.forwardRef<unknown, DefaultCodeEditorProps>((props, _ref) => (
  <DefaultJSONEditor {...props} />
));

export const MonitorTypeRadioGroup = React.forwardRef<unknown, MonitorTypeRadioGroupProps>(
  (props, _ref) => <DefaultMonitorTypeRadioGroup {...props} />
);

export const HeaderField = React.forwardRef<unknown, DefaultHeaderFieldProps>((props, _ref) => (
  <DefaultHeaderField {...props} />
));

export const KeyValuePairsField = React.forwardRef<unknown, DefaultKeyValuePairsFieldProps>(
  (props, _ref) => <DefaultKeyValuePairsField {...props} />
);

export const RequestBodyField = React.forwardRef<unknown, DefaultRequestBodyFieldProps>(
  (props, _ref) => <DefaultRequestBodyField {...props} />
);

export const ResponseBodyIndexField = React.forwardRef<unknown, DefaultResponseBodyIndexFieldProps>(
  (props, _ref) => <DefaultResponseBodyIndexField {...props} />
);

export const ThrottlingWrapper = React.forwardRef<unknown, ThrottlingConfigFieldProps>(
  (props, _ref) => <ThrottlingConfigField {...props} />
);

export const MaintenanceWindowsFieldWrapper = React.forwardRef<
  unknown,
  MaintenanceWindowsFieldProps
>((props, _ref) => <MaintenanceWindowsField {...props} />);

export const KibanaSpacesWrapper = React.forwardRef<unknown, MonitorSpacesProps>((props, _ref) => (
  <MonitorSpaces {...props} />
));
