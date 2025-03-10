/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';

export const isExplicitSynonym = (synonym: string) => {
  return synonym.trim().includes('=>');
};

export const getExplicitSynonym = (synonym: string) => {
  return {
    mapFromString: synonym.split('=>')[0].trim(),
    mapToString: synonym.split('=>')[1].trim(),
  };
};

export const formatSynonymsSetName = (rawName: string) =>
  rawName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-') // Replace all special/non-alphanumerical characters with dashes
    .replace(/^[-]+|[-]+$/g, '') // Strip all leading and trailing dashes
    .toLowerCase();

type SynonymsToComboBoxOption = (synonymString: string) => {
  parsedFromTerms: EuiComboBoxOptionOption[];
  parsedToTermsString: string;
  parsedIsExplicit: boolean;
};

export const synonymToComboBoxOption: SynonymsToComboBoxOption = (synonymString: string) => {
  const isExplicit = isExplicitSynonym(synonymString);
  if (!isExplicit) {
    return {
      parsedFromTerms: synonymsStringToOption(synonymString),
      parsedToTermsString: '',
      parsedIsExplicit: isExplicit,
    };
  } else {
    const { mapFromString, mapToString } = getExplicitSynonym(synonymString);
    return {
      parsedFromTerms: synonymsStringToOption(mapFromString),
      parsedToTermsString: mapToString,
      parsedIsExplicit: isExplicit,
    };
  }
};
export const synonymsStringToOption = (synonyms: string) =>
  synonyms.length === 0
    ? []
    : synonyms
        .trim()
        .split(',')
        .map((s, index) => ({ label: s, key: index + '-' + s.trim() }));

export const synonymsOptionToString = ({
  fromTerms,
  toTerms,
  isExplicit,
}: {
  fromTerms: EuiComboBoxOptionOption[];
  toTerms: string;
  isExplicit: boolean;
}) => `${fromTerms.map((s) => s.label).join(',')}${isExplicit ? ' => ' + toTerms.trim() : ''}`;

export const isPermissionError = (error: { body: KibanaServerError }) => {
  return error.body.statusCode === 403;
};
