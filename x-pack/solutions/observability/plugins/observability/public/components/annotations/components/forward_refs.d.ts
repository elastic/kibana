import React from 'react';
export declare const FieldText: React.ForwardRefExoticComponent<React.InputHTMLAttributes<HTMLInputElement> & import("@elastic/eui").CommonProps & {
    icon?: import("@elastic/eui").EuiFormControlLayoutProps["icon"];
    isInvalid?: boolean;
    fullWidth?: boolean;
    isLoading?: boolean;
    readOnly?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
    prepend?: import("@elastic/eui").EuiFormControlLayoutProps["prepend"];
    append?: import("@elastic/eui").EuiFormControlLayoutProps["append"];
    controlOnly?: boolean;
    compressed?: boolean;
} & React.RefAttributes<HTMLInputElement>>;
export declare const NumberField: React.ForwardRefExoticComponent<Omit<React.InputHTMLAttributes<HTMLInputElement>, "readOnly" | "min" | "max" | "step"> & import("@elastic/eui").CommonProps & {
    icon?: import("@elastic/eui").EuiFormControlLayoutProps["icon"];
    isInvalid?: boolean;
    fullWidth?: boolean;
    isLoading?: boolean;
    readOnly?: boolean;
    min?: number;
    max?: number;
    step?: number | "any";
    inputRef?: React.Ref<HTMLInputElement>;
    prepend?: import("@elastic/eui").EuiFormControlLayoutProps["prepend"];
    append?: import("@elastic/eui").EuiFormControlLayoutProps["append"];
    controlOnly?: boolean;
    compressed?: boolean;
} & React.RefAttributes<HTMLInputElement>>;
export declare const TextArea: React.ForwardRefExoticComponent<React.TextareaHTMLAttributes<HTMLTextAreaElement> & import("@elastic/eui").CommonProps & {
    icon?: import("@elastic/eui").EuiFormControlLayoutIconsProps["icon"];
    isLoading?: boolean;
    isInvalid?: boolean;
    isClearable?: boolean;
    fullWidth?: boolean;
    compressed?: boolean;
    resize?: typeof import("@elastic/eui/src/components/form/text_area/text_area").RESIZE[number];
    inputRef?: React.Ref<HTMLTextAreaElement>;
} & React.RefAttributes<HTMLTextAreaElement>>;
export declare const ComboBox: React.ForwardRefExoticComponent<Omit<import("@elastic/eui/src/components/combo_box/combo_box")._EuiComboBoxProps<string>, "options" | "async" | "fullWidth" | "prepend" | "append" | "selectedOptions" | "compressed" | "isClearable" | "singleSelection" | "sortMatchesBy" | "optionMatcher"> & Partial<Omit<{
    async: boolean;
    compressed: boolean;
    fullWidth: boolean;
    isClearable: boolean;
    options: never[];
    selectedOptions: never[];
    singleSelection: boolean;
    prepend: undefined;
    append: undefined;
    sortMatchesBy: "none";
    optionMatcher: import("@elastic/eui").EuiComboBoxOptionMatcher<unknown>;
}, "options" | "selectedOptions" | "optionMatcher"> & {
    options: import("@elastic/eui").EuiComboBoxOptionOption<string>[];
    selectedOptions: import("@elastic/eui").EuiComboBoxOptionOption<string>[];
    optionMatcher: import("@elastic/eui").EuiComboBoxOptionMatcher<string>;
}> & React.RefAttributes<unknown>>;
export declare const Switch: React.ForwardRefExoticComponent<import("@elastic/eui").CommonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "disabled"> & {
    showLabel?: boolean;
    label: React.ReactNode | string;
    checked: boolean;
    onChange: (event: import("@elastic/eui").EuiSwitchEvent) => void;
    disabled?: boolean;
    compressed?: boolean;
    labelProps?: import("@elastic/eui").CommonProps & React.HTMLAttributes<HTMLSpanElement>;
} & React.RefAttributes<unknown>>;
export declare const Select: React.ForwardRefExoticComponent<Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value"> & import("@elastic/eui").CommonProps & {
    options?: import("@elastic/eui").EuiSelectOption[];
    isInvalid?: boolean;
    fullWidth?: boolean;
    isLoading?: boolean;
    hasNoInitialSelection?: boolean;
    inputRef?: React.Ref<HTMLSelectElement>;
    value?: string | number;
    compressed?: boolean;
    prepend?: import("@elastic/eui").EuiFormControlLayoutProps["prepend"];
    append?: import("@elastic/eui").EuiFormControlLayoutProps["append"];
} & React.RefAttributes<HTMLSelectElement>>;
