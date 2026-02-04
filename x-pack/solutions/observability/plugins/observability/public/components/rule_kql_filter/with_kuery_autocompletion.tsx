/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataViewBase } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
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
  // lacking cancellation support in the autocompletion api,
  // this is used to keep older, slower requests from clobbering newer ones
  currentRequest: {
    expression: string;
    cursorPosition: number;
  } | null;
  suggestions: QuerySuggestion[];
}

class WithKueryAutocompletionComponent extends React.Component<
  WithKueryAutocompletionLifecycleProps,
  WithKueryAutocompletionLifecycleState
> {
  public readonly state: WithKueryAutocompletionLifecycleState = {
    currentRequest: null,
    suggestions: [],
  };

  public render() {
    const { currentRequest, suggestions } = this.state;

    return this.props.children({
      isLoadingSuggestions: currentRequest !== null,
      loadSuggestions: this.loadSuggestions,
      suggestions,
    });
  }

  private loadSuggestions = async (
    expression: string,
    cursorPosition: number,
    maxSuggestions?: number,
    transformSuggestions?: (s: QuerySuggestion[]) => QuerySuggestion[]
  ) => {
    const { indexPattern, kql } = this.props;
    const language = 'kuery';
    const hasQuerySuggestions = kql.autocomplete.hasQuerySuggestions(language);

    if (!hasQuerySuggestions) {
      return;
    }

    this.setState({
      currentRequest: {
        expression,
        cursorPosition,
      },
      suggestions: [],
    });

    const suggestions =
      (await kql.autocomplete.getQuerySuggestions({
        language,
        query: expression,
        selectionStart: cursorPosition,
        selectionEnd: cursorPosition,
        indexPatterns: [indexPattern as DataView],
        boolFilter: [],
      })) || [];

    const transformedSuggestions = transformSuggestions
      ? transformSuggestions(suggestions)
      : suggestions;

    this.setState((state) =>
      state.currentRequest &&
      state.currentRequest.expression !== expression &&
      state.currentRequest.cursorPosition !== cursorPosition
        ? state // ignore this result, since a newer request is in flight
        : {
            ...state,
            currentRequest: null,
            suggestions: maxSuggestions
              ? transformedSuggestions.slice(0, maxSuggestions)
              : transformedSuggestions,
          }
    );
  };
}

export const WithKueryAutocompletion = WithKueryAutocompletionComponent;

// eslint-disable-next-line import/no-default-export
export default WithKueryAutocompletion;
