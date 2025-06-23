/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiThemeProvider,
  useEuiTheme,
} from '@elastic/eui';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ConsolePluginStart } from '@kbn/console-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';

import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { getDefaultCodingLanguage } from '../../utils/language';

import * as Styles from './styles';
import { CodeLanguage } from '../../types';

export interface CodeSampleOption {
  language: CodeLanguage;
  code: string;
}

export interface CodeBoxProps {
  'data-test-subj'?: string;
  consoleCode?: string;
  options: CodeSampleOption[];
  showTopBar?: boolean;
}

export const CodeBox = (props: CodeBoxProps) => {
  const { consoleCode, options, showTopBar = true } = props;
  const dataTestSubj = props['data-test-subj'];
  const { euiTheme } = useEuiTheme();
  const {
    application,
    console: consolePlugin,
    share: sharePlugin,
  } = useKibana<{
    console?: ConsolePluginStart;
    share?: SharePluginStart;
  }>().services;
  const assetBasePath = useAssetBasePath();
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [selectedLangId, setSelectedLanguage] = useState<string | null>(getDefaultCodingLanguage);
  const selectedOption: CodeSampleOption | null = useMemo(
    () => options.find((opt) => opt.language.id === selectedLangId) ?? null,
    [selectedLangId, options]
  );
  const langItems = useMemo(
    () =>
      options.map(({ language }) => (
        <EuiContextMenuItem
          key={language.id}
          icon={`${assetBasePath}/${language.icon}`}
          aria-label={i18n.translate('xpack.searchIndices.codeBox.languageMenu.item.ariaLabel', {
            defaultMessage: 'Change language to {languageName} for this code example',
            values: { languageName: language.title },
          })}
          onClick={() => {
            if (setSelectedLanguage) {
              setSelectedLanguage(language.id);
              setIsPopoverOpen(false);
            }
          }}
        >
          {language.title}
        </EuiContextMenuItem>
      )),
    [options, assetBasePath]
  );
  const codeSnippet = selectedOption?.code ?? '';

  const languageButton = selectedOption ? (
    <EuiThemeProvider colorMode="dark">
      <EuiButtonEmpty
        data-test-subj={
          dataTestSubj ? `${dataTestSubj}-select-lang-button` : 'code-box-select-lang-button'
        }
        aria-label={i18n.translate('xpack.searchIndices.codeBox.languageSelect.ariaLabel', {
          defaultMessage: 'Select a programming language for the code snippet {languageName}',
          values: { languageName: selectedOption.language.title },
        })}
        color="text"
        iconType="arrowDown"
        iconSide="left"
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      >
        {selectedOption.language.title}
      </EuiButtonEmpty>
    </EuiThemeProvider>
  ) : null;

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel
        paddingSize="xs"
        data-test-subj={dataTestSubj ?? 'codeBlockControlsPanel'}
        css={Styles.CodeBoxPanel(euiTheme)}
      >
        {showTopBar && (
          <>
            <EuiFlexGroup
              alignItems="center"
              responsive={false}
              gutterSize="s"
              justifyContent={options.length !== 0 ? 'spaceBetween' : 'flexEnd'}
            >
              {options && languageButton && (
                <EuiFlexItem>
                  <EuiThemeProvider colorMode="light">
                    <EuiPopover
                      button={languageButton}
                      isOpen={isPopoverOpen}
                      closePopover={() => setIsPopoverOpen(false)}
                      panelPaddingSize="none"
                      anchorPosition="downLeft"
                    >
                      <EuiContextMenuPanel items={langItems} size="s" />
                    </EuiPopover>
                  </EuiThemeProvider>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={codeSnippet}>
                  {(copy) => (
                    <EuiButtonEmpty
                      data-test-subj={
                        dataTestSubj ? `${dataTestSubj}-copy-code-btn` : 'copy-code-btn'
                      }
                      color="text"
                      iconType="copyClipboard"
                      size="s"
                      onClick={copy}
                      aria-label={i18n.translate('xpack.searchIndices.codeBox.copyCode.ariaLabel', {
                        defaultMessage: 'Copy the code snippet',
                      })}
                    >
                      {i18n.translate('xpack.searchIndices.codeBox.copyButtonLabel', {
                        defaultMessage: 'Copy',
                      })}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              {consoleCode !== undefined && sharePlugin && (
                <EuiFlexItem grow={false}>
                  <TryInConsoleButton
                    request={consoleCode}
                    application={application}
                    consolePlugin={consolePlugin}
                    sharePlugin={sharePlugin}
                    data-test-subj={`${dataTestSubj}-run-in-console-btn`}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="none" />
          </>
        )}
        <EuiCodeBlock
          isCopyable={!showTopBar}
          transparentBackground
          fontSize="m"
          language={selectedOption?.language.codeBlockLanguage || 'text'}
          overflowHeight={500}
          css={Styles.CodeBoxCodeBlock}
        >
          {codeSnippet}
        </EuiCodeBlock>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
