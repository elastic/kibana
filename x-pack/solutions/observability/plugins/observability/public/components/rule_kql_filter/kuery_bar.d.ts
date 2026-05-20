import React from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { KqlPluginStart, QuerySuggestion } from '@kbn/kql/public';
type LoadSuggestionsFn = (e: string, p: number, m?: number, transform?: (s: QuerySuggestion[]) => QuerySuggestion[]) => void;
export type CurryLoadSuggestionsType = (loadSuggestions: LoadSuggestionsFn) => LoadSuggestionsFn;
export interface RuleFlyoutKueryBarProps {
    derivedIndexPattern: DataViewBase;
    onSubmit: (query: string) => void;
    onChange?: (query: string) => void;
    value?: string | null;
    placeholder?: string;
    curryLoadSuggestions?: CurryLoadSuggestionsType;
    compressed?: boolean;
    kql: KqlPluginStart;
}
export declare function RuleFlyoutKueryBar({ derivedIndexPattern, onSubmit, onChange, value, placeholder, curryLoadSuggestions, compressed, kql, }: RuleFlyoutKueryBarProps): React.JSX.Element;
export default RuleFlyoutKueryBar;
