/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSuperSelect, EuiText, EuiFlexGroup, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { AvailableLanguages } from '@kbn/search-code-examples/src/getting-started-tutorials';
import type { CodeLanguage } from '@kbn/search-code-examples/src/getting-started-tutorials/types';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

export interface LanguageSelectorProps {
  selectedLanguage: AvailableLanguages;
  options: CodeLanguage[];
  onSelectLanguage: (value: AvailableLanguages) => void;
  showLabel?: boolean;
}

export const LanguageSelector = ({
  selectedLanguage,
  options,
  onSelectLanguage,
  showLabel = false,
}: LanguageSelectorProps) => {
  const assetBasePath = useAssetBasePath();
  const languageOptions = useMemo(
    () =>
      options.map((lang) => ({
        value: lang.id as AvailableLanguages,
        'aria-label': i18n.translate('xpack.gettingStarted.codeLanguage.selectChangeAriaLabel', {
          defaultMessage:
            'Change language of code examples to {language} for every instance on this page',
          values: {
            language: lang.title,
          },
        }),
        'data-test-subj': `lang-option-${lang.id}`,
        inputDisplay: (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiIcon type={`${assetBasePath}/${lang.icon}`} />
            <EuiText>{lang.title}</EuiText>
          </EuiFlexGroup>
        ),
      })),
    [assetBasePath, options]
  );
  return (
    <EuiSuperSelect<AvailableLanguages>
      prepend={
        showLabel
          ? i18n.translate('xpack.gettingStarted.codeLanguage.selectLabel', {
              defaultMessage: 'Language',
            })
          : undefined
      }
      aria-label={i18n.translate('xpack.gettingStarted.codeLanguage.selectLabel', {
        defaultMessage: 'Select a programming language for the code examples',
      })}
      options={languageOptions}
      valueOfSelected={selectedLanguage}
      onChange={onSelectLanguage}
      data-test-subj="codeExampleLanguageSelect"
    />
  );
};
