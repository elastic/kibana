/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { useState } from 'react';
import { SynonymsSynonymRule } from '@elastic/elasticsearch/lib/api/types';
import { synonymToComboBoxOption, synonymsOptionToString } from '../../utils/synonyms_utils';
import { ERROR_MESSAGES } from './constants';

export interface InitialFlyoutState {
  synonymRule: SynonymsSynonymRule;
  flyoutMode: 'create' | 'edit';
  renderExplicit?: boolean;
}

type SortDirection = 'ascending' | 'descending';

export const useSynonymRuleFlyoutState = ({
  synonymRule,
  flyoutMode,
  renderExplicit = false,
}: InitialFlyoutState) => {
  const { parsedFromTerms, parsedToTermsString, parsedIsExplicit } = synonymToComboBoxOption(
    flyoutMode === 'create' ? '' : synonymRule.synonyms
  );
  const sortedParsedFromTerms = [...parsedFromTerms].sort((a, b) => a.label.localeCompare(b.label));

  const isExplicit = renderExplicit || parsedIsExplicit;

  const [fromTerms, setFromTerms] = useState<EuiComboBoxOptionOption[]>(sortedParsedFromTerms);

  const [mapToTerms, setMapToTerms] = useState<string>(parsedToTermsString);
  const [isFromTermsInvalid, setIsFromTermsInvalid] = useState(false);
  const [isMapToTermsInvalid, setIsMapToTermsInvalid] = useState(false);
  const [fromTermErrors, setFromTermErrors] = useState<string[]>([]);
  const [mapToTermErrors, setMapToTermErrors] = useState<string[]>([]);
  const [currentSortDirection, setCurrentSortDirection] = useState<SortDirection>('ascending');

  const hasChanges =
    flyoutMode === 'create'
      ? (fromTerms.length !== 0 || mapToTerms.length !== 0) &&
        synonymsOptionToString({
          fromTerms,
          toTerms: mapToTerms,
          isExplicit,
        }) !== synonymRule.synonyms
      : synonymsOptionToString({
          fromTerms,
          toTerms: mapToTerms,
          isExplicit,
        }) !== synonymRule.synonyms;

  const canSave =
    fromTerms.length > 0 &&
    !(isExplicit && !mapToTerms) &&
    hasChanges &&
    !isFromTermsInvalid &&
    !isMapToTermsInvalid;

  const resetChanges = () => {
    setFromTerms(parsedFromTerms);
    setMapToTerms(parsedToTermsString);
    setIsFromTermsInvalid(false);
    setIsMapToTermsInvalid(false);
    setFromTermErrors([]);
    setMapToTermErrors([]);
  };

  const isValid = (value: string) => {
    const trimmedValue = value.trim();
    if (value !== '' && trimmedValue === '') {
      setIsFromTermsInvalid(true);
      setFromTermErrors([ERROR_MESSAGES.empty_from_term]);
      return false;
    }

    if (isExplicit && trimmedValue.includes('=>')) {
      setIsFromTermsInvalid(true);
      setFromTermErrors([ERROR_MESSAGES.multiple_explicit_separator]);
      return false;
    }
    const exists = fromTerms.find((term) => term.label === value);
    if (exists !== undefined) {
      setFromTermErrors([ERROR_MESSAGES.term_exists]);
      setIsFromTermsInvalid(true);
      return false;
    } else {
      setIsFromTermsInvalid(false);
      setFromTermErrors([]);
      return true;
    }
  };

  const isMapToValid = (value: string) => {
    const trimmedValue = value.trim();
    if (value !== '' && trimmedValue === '') {
      setIsMapToTermsInvalid(true);
      setMapToTermErrors([ERROR_MESSAGES.empty_to_term]);
      return false;
    }
    if (trimmedValue.includes('=>')) {
      setIsMapToTermsInvalid(true);
      setMapToTermErrors([ERROR_MESSAGES.multiple_explicit_separator]);
      return false;
    }
    if (trimmedValue.split(',').some((term) => term.trim() === '')) {
      setIsMapToTermsInvalid(true);
      setMapToTermErrors([ERROR_MESSAGES.empty_to_term]);
      return false;
    }

    setIsMapToTermsInvalid(false);
    return true;
  };

  const onSortTerms = (direction?: SortDirection) => {
    if (!direction) {
      direction = currentSortDirection === 'ascending' ? 'descending' : 'ascending';
    }
    fromTerms.sort((a, b) =>
      direction === 'ascending' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label)
    );
    setCurrentSortDirection(direction);
    setFromTerms([...fromTerms]);
  };

  const onSearchChange = (searchValue: string) => {
    if (!searchValue) {
      setIsFromTermsInvalid(false);
      setFromTermErrors([]);
      return;
    }
    setIsFromTermsInvalid(!isValid(searchValue));
  };

  const onCreateOption = (searchValue: string) => {
    if (searchValue.trim() === '') {
      return;
    }
    if (!isValid(searchValue)) {
      return false;
    }
    setFromTerms([...fromTerms, { label: searchValue, key: searchValue }]);
  };

  const removeTermFromOptions = (term: EuiComboBoxOptionOption) => {
    setFromTerms(fromTerms.filter((t) => t.label !== term.label));
  };

  const clearFromTerms = () => setFromTerms([]);
  const onMapToChange = (value: string) => {
    isMapToValid(value);
    setMapToTerms(value);
  };

  return {
    canSave,
    clearFromTerms,
    currentSortDirection,
    fromTermErrors,
    fromTerms,
    hasChanges,
    isExplicit,
    isFromTermsInvalid,
    isMapToTermsInvalid,
    mapToTermErrors,
    mapToTerms,
    onCreateOption,
    onMapToChange,
    onSearchChange,
    onSortTerms,
    removeTermFromOptions,
    resetChanges,
  };
};
