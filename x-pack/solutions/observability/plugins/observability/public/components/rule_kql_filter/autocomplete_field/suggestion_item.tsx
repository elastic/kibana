/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, euiPaletteColorBlind, EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { QuerySuggestion, QuerySuggestionTypes } from '@kbn/unified-search-plugin/public';
import { transparentize } from 'polished';
import { css } from '@emotion/react';

interface Props {
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  suggestion: QuerySuggestion;
}

export function SuggestionItem(props: Props) {
  const { isSelected, onClick, onMouseEnter, onKeyDown, suggestion } = props;
  const { euiTheme } = useEuiTheme();

  const suggestionItemContainerCss = `
    display: flex;
    flex-direction: row;
    font-size: ${euiTheme.font.scale.s};
    height: ${euiTheme.size.xl};
    white-space: nowrap;
    background-color: ${isSelected ? euiTheme.colors.lightestShade : 'transparent'};
  `;

  const suggestionItemFieldCss = `
    align-items: center;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    height: ${euiTheme.size.xl};
    padding: ${euiTheme.size.xs};
  `;

  const suggestionItemIconFieldCss = `
    background-color: ${transparentize(0.9, getEuiIconColor(euiTheme, suggestion.type))};
    color: ${getEuiIconColor(euiTheme, suggestion.type)};
    flex: 0 0 auto;
    justify-content: center;
    width: ${euiTheme.size.xl};
  `;

  const suggestionItemTextFieldCss = `
    flex: 2 0 0;
    font-family: ${euiTheme.font.familyCode};
  `;

  const suggestionItemDescriptionFieldCss = `
    flex: 3 0 0;
    p {
      display: inline;
      span {
        font-family: ${euiTheme.font.familyCode};
      }
    }
  `;

  return (
    <div
      css={suggestionItemContainerCss}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onKeyDown={onKeyDown}
    >
      <div
        css={css`
          ${suggestionItemFieldCss}
          ${suggestionItemIconFieldCss}
        `}
      >
        <EuiIcon type={getEuiIconType(suggestion.type)} />
      </div>
      <div
        css={css`
          ${suggestionItemFieldCss}
          ${suggestionItemTextFieldCss}
        `}
      >
        {suggestion.text}
      </div>
      <div
        css={css`
          ${suggestionItemFieldCss}
          ${suggestionItemDescriptionFieldCss}
        `}
      >
        {suggestion.description}
      </div>
    </div>
  );
}

SuggestionItem.defaultProps = {
  isSelected: false,
};

const getEuiIconType = (suggestionType: QuerySuggestionTypes) => {
  switch (suggestionType) {
    case QuerySuggestionTypes.Field:
      return 'kqlField';
    case QuerySuggestionTypes.Value:
      return 'kqlValue';
    case QuerySuggestionTypes.RecentSearch:
      return 'search';
    case QuerySuggestionTypes.Conjunction:
      return 'kqlSelector';
    case QuerySuggestionTypes.Operator:
      return 'kqlOperand';
    default:
      return 'empty';
  }
};

const getEuiIconColor = (
  euiTheme: EuiThemeComputed,
  suggestionType: QuerySuggestionTypes
): string => {
  const palette = euiPaletteColorBlind();

  switch (suggestionType) {
    case QuerySuggestionTypes.Field:
      return palette[7];
    case QuerySuggestionTypes.Value:
      return palette[0];
    case QuerySuggestionTypes.Operator:
      return palette[1];
    case QuerySuggestionTypes.Conjunction:
      return palette[2];
    case QuerySuggestionTypes.RecentSearch:
    default:
      return euiTheme.colors.mediumShade;
  }
};
