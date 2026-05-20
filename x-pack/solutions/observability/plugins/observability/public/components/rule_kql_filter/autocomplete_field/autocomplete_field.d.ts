import type { EuiThemeComputed } from '@elastic/eui';
import React from 'react';
import type { QuerySuggestion } from '@kbn/kql/public';
export type StateUpdater<State, Props = {}> = (prevState: Readonly<State>, prevProps: Readonly<Props>) => State | null;
export interface AutocompleteFieldProps {
    isLoadingSuggestions: boolean;
    isValid: boolean;
    loadSuggestions: (value: string, cursorPosition: number, maxCount?: number) => void;
    onSubmit?: (value: string) => void;
    onChange?: (value: string) => void;
    placeholder?: string;
    suggestions: QuerySuggestion[];
    value: string;
    disabled?: boolean;
    autoFocus?: boolean;
    'aria-label'?: string;
    compressed?: boolean;
    theme?: EuiThemeComputed;
}
interface AutocompleteFieldState {
    areSuggestionsVisible: boolean;
    isFocused: boolean;
    selectedIndex: number | null;
}
export declare class AutocompleteField extends React.Component<AutocompleteFieldProps, AutocompleteFieldState> {
    readonly state: AutocompleteFieldState;
    private inputElement;
    render(): React.JSX.Element;
    componentDidMount(): void;
    componentDidUpdate(prevProps: AutocompleteFieldProps): void;
    private handleChangeInputRef;
    private handleChange;
    private handleKeyDown;
    private handleKeyUp;
    private handleFocus;
    private handleBlur;
    private selectSuggestionAt;
    private applySelectedSuggestion;
    private applySuggestionAt;
    private changeValue;
    private focusInputElement;
    private showSuggestions;
    private submit;
    private updateSuggestions;
}
export default AutocompleteField;
