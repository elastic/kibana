/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { useKibana } from '../../services';
import { DEFAULT_LANGUAGE, LANGUAGES, type Language, type SnippetSet } from './languages';
import { fillPlaceholders } from './console_snippets';
import { useOnboardingCredentials } from '../../hooks/use_onboarding_credentials';
import type { DocsPanelProps, OnboardingPill, VectorPath, WizardStep } from '../types';
import { OnboardingDocPanel } from './onboarding_doc_panel';
import { OnboardingPills } from './onboarding_pills';

const SNIPPET_OVERFLOW_HEIGHT = 420;

export interface ApiStepTab {
  id: string;
  label: string;
  snippets: SnippetSet;
  consoleRequest: string;
}

interface ApiStepProps {
  tabs: ApiStepTab[];
  consoleComment: string;
  docsPanel: DocsPanelProps[];
  pills: OnboardingPill[];
  step: WizardStep;
  path: VectorPath;
}

export const ApiStep = ({ tabs, consoleComment, docsPanel, pills, step, path }: ApiStepProps) => {
  const {
    services: { application, share, console: consolePlugin },
  } = useKibana();
  const { elasticsearchUrl, apiKey } = useOnboardingCredentials();
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [isLanguagePopoverOpen, setIsLanguagePopoverOpen] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState(tabs[0].id);

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];
  const { snippets, consoleRequest } = selectedTab;

  const selectedLanguage = LANGUAGES.find((l) => l.id === language);
  const syntax = selectedLanguage?.syntax ?? 'python';
  const renderedSnippet = fillPlaceholders(
    snippets[language],
    elasticsearchUrl ?? undefined,
    apiKey ?? undefined
  );

  const telemetryPrefix = `vectordbOnboarding-${step}-${path}`;

  const languageMenuItems = LANGUAGES.map((lang) => (
    <EuiContextMenuItem
      key={lang.id}
      icon={<EuiIcon type={lang.icon} size="m" aria-hidden={true} />}
      onClick={() => {
        setLanguage(lang.id);
        setIsLanguagePopoverOpen(false);
      }}
      aria-label={i18n.translate('vectordbOnboarding.wizard.languageChangeAriaLabel', {
        defaultMessage: 'Change language to {language}',
        values: { language: lang.label },
      })}
      data-test-subj={`vectordbWizardLanguageOption-${lang.id}`}
      data-telemetry-id={`${telemetryPrefix}-selectLanguage-${lang.id}`}
    >
      {lang.label}
    </EuiContextMenuItem>
  ));

  const requestWithComment = `
# ===============================================
# 🚀 ${consoleComment}
# ===============================================
\n${consoleRequest}`;

  return (
    <>
      <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false} color="subdued">
        {pills.length > 0 && (
          <>
            <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false} color="subdued">
              <OnboardingPills pills={pills} telemetryPrefix={telemetryPrefix} />
            </EuiPanel>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiPanel paddingSize="none" hasBorder={false} hasShadow={true} color="plain">
          <EuiPanel paddingSize="s" hasShadow={false} color="transparent">
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={true}>
                {tabs.length > 1 && (
                  <EuiTabs size="s" bottomBorder={false}>
                    {tabs.map((tab) => (
                      <EuiTab
                        key={tab.id}
                        isSelected={tab.id === selectedTab.id}
                        onClick={() => setSelectedTabId(tab.id)}
                        data-test-subj={`vectordbWizardSnippetTab-${tab.id}`}
                        data-telemetry-id={`${telemetryPrefix}-selectTab-${tab.id}`}
                      >
                        {tab.label}
                      </EuiTab>
                    ))}
                  </EuiTabs>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiButtonEmpty
                      size="s"
                      iconType="arrowDown"
                      color="text"
                      iconSide="right"
                      onClick={() => setIsLanguagePopoverOpen(!isLanguagePopoverOpen)}
                      data-test-subj="vectordbWizardLanguagePicker"
                      data-telemetry-id={`${telemetryPrefix}-openLanguagePicker`}
                    >
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        {selectedLanguage?.icon && (
                          <EuiFlexItem grow={false}>
                            <EuiIcon type={selectedLanguage.icon} size="m" aria-hidden={true} />
                          </EuiFlexItem>
                        )}
                        <EuiFlexItem grow={false}>{selectedLanguage?.label}</EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiButtonEmpty>
                  }
                  isOpen={isLanguagePopoverOpen}
                  closePopover={() => setIsLanguagePopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                  aria-label={i18n.translate('vectordbOnboarding.wizard.languagePickerLegend', {
                    defaultMessage: 'Select a programming language for code snippets',
                  })}
                >
                  <EuiContextMenuPanel items={languageMenuItems} />
                </EuiPopover>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiCopy textToCopy={renderedSnippet}>
                      {(copy) => (
                        <EuiButton
                          size="s"
                          color="text"
                          iconType="copy"
                          iconSide="right"
                          onClick={copy}
                          data-test-subj="vectordbWizardCopyCode"
                          data-telemetry-id={`${telemetryPrefix}-copyCode`}
                        >
                          {i18n.translate('vectordbOnboarding.wizard.copyCode', {
                            defaultMessage: 'Copy',
                          })}
                        </EuiButton>
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiHorizontalRule margin="none" />

          <EuiCodeBlock
            language={syntax}
            lineNumbers
            fontSize="m"
            paddingSize="m"
            overflowHeight={SNIPPET_OVERFLOW_HEIGHT}
            transparentBackground
            data-test-subj="vectordbWizardSnippet"
          >
            {renderedSnippet}
          </EuiCodeBlock>
        </EuiPanel>
        <EuiSpacer size="s" />
        <EuiPanel paddingSize="xs" hasBorder={false} hasShadow={false} color="transparent">
          <EuiFlexGroup gutterSize="s" direction="row" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon color="subdued" size="m" type="bulb" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiText size="s" color="subdued">
                <p>
                  {i18n.translate('vectordbOnboarding.apiStep.tryInConsoleDescription', {
                    defaultMessage:
                      'You can use our interactive console to easily send requests to the Elasticsearch REST API',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TryInConsoleButton
                request={requestWithComment}
                application={application}
                consolePlugin={consolePlugin}
                sharePlugin={share}
                type="emptyButton"
                color="text"
                iconType="sessionViewer"
                data-test-subj="vectordbWizardRunInConsole"
                telemetryId={`${telemetryPrefix}-runInConsole`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>
      <EuiSpacer size="xxl" />
      <EuiTitle size="xxs">
        <h2>
          <EuiTextColor color="subdued">
            {i18n.translate('vectordbOnboarding.apiStep.documentationTitle', {
              defaultMessage: 'Documentation',
            })}
          </EuiTextColor>
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="s" direction="column" alignItems="flexStart" responsive={false}>
        {docsPanel.map((doc, i) => (
          <React.Fragment key={doc.id}>
            {i > 0 && <EuiHorizontalRule margin="m" />}
            <OnboardingDocPanel doc={doc} telemetryPrefix={telemetryPrefix} />
          </React.Fragment>
        ))}
      </EuiFlexGroup>
    </>
  );
};
