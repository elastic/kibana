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

export const useFlyoutState = ({
  synonymRule,
  flyoutMode,
  renderExplicit = false,
}: InitialFlyoutState) => {
  const { parsedFromTerms, parsedToTermsString, parsedIsExplicit } = synonymToComboBoxOption(
    flyoutMode === 'create' ? '' : synonymRule.synonyms
  );

  const isExplicit = renderExplicit || parsedIsExplicit;

  const [fromTerms, setFromTerms] = useState<EuiComboBoxOptionOption[]>(parsedFromTerms);

  const [mapToTerms, setMapToTerms] = useState<string>(parsedToTermsString);
  const [isFromTermsInvalid, setIsFromTermsInvalid] = useState(false);
  const [isMapToTermsInvalid, setIsMapToTermsInvalid] = useState(false);
  const [fromTermErrors, setFromTermErrors] = useState<string[]>([]);
  const [mapToTermErrors, setMapToTermErrors] = useState<string[]>([]);

  const hasChanges =
    synonymsOptionToString({
      fromTerms,
      toTerms: mapToTerms,
      isExplicit,
    }) !== synonymRule.synonyms;

  const canSave =
    fromTerms.length &&
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
    if (value !== '' && value.trim() === '') {
      setIsFromTermsInvalid(true);
      setFromTermErrors([ERROR_MESSAGES.empty_from_term]);
      return false;
    }

    if (
      isExplicit &&
      value
        .trim()
        .split(',')
        .some((term) => term.trim().includes('=>'))
    ) {
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
    if (value !== '' && value.trim() === '') {
      setIsMapToTermsInvalid(true);
      setMapToTermErrors([ERROR_MESSAGES.empty_to_term]);
      return false;
    }
    if (value.trim().includes('=>')) {
      setIsMapToTermsInvalid(true);
      setMapToTermErrors([ERROR_MESSAGES.multiple_explicit_separator]);
      return false;
    }
    if (value.trim().split(',').includes('')) {
      setIsMapToTermsInvalid(true);
      setMapToTermErrors([ERROR_MESSAGES.empty_to_term]);
      return false;
    }

    setIsMapToTermsInvalid(false);
    return true;
  };

  const onSortTerms = () => {
    fromTerms.sort((a, b) => a.label.localeCompare(b.label));
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
    fromTermErrors,
    fromTerms,
    hasChanges,
    isExplicit,
    isFromTermsInvalid,
    isMapToTermsInvalid,
    mapToTermErrors,
    mapToTerms,
    clearFromTerms,
    onCreateOption,
    onMapToChange,
    onSearchChange,
    onSortTerms,
    removeTermFromOptions,
    resetChanges,
  };
};
