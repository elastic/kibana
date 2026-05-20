import React from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { KqlPluginStart, QuerySuggestion } from '@kbn/kql/public';
import type { RendererFunction } from '../custom_threshold/types';
export interface WithKueryAutocompletionLifecycleProps {
    children: RendererFunction<{
        isLoadingSuggestions: boolean;
        loadSuggestions: (expression: string, cursorPosition: number, maxSuggestions?: number) => void;
        suggestions: QuerySuggestion[];
    }>;
    indexPattern: DataViewBase;
    kql: KqlPluginStart;
}
interface WithKueryAutocompletionLifecycleState {
    currentRequest: {
        expression: string;
        cursorPosition: number;
    } | null;
    suggestions: QuerySuggestion[];
}
declare class WithKueryAutocompletionComponent extends React.Component<WithKueryAutocompletionLifecycleProps, WithKueryAutocompletionLifecycleState> {
    readonly state: WithKueryAutocompletionLifecycleState;
    render(): import("../custom_threshold/types").RendererResult;
    private loadSuggestions;
}
export declare const WithKueryAutocompletion: typeof WithKueryAutocompletionComponent;
export default WithKueryAutocompletion;
