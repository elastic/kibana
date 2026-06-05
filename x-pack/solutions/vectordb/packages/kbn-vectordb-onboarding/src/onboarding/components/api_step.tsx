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
  EuiButtonIcon,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { useKibana } from '../../services';
import { DEFAULT_LANGUAGE, LANGUAGES, type Language, type SnippetSet } from './languages';
import { fillPlaceholders } from './snippets';
import { useOnboardingCredentials } from '../../hooks/use_onboarding_credentials';
import type { VectorPath, WizardStep } from '../types';

const SNIPPET_OVERFLOW_HEIGHT = 420;

interface InfoPanelProps {
  title: string;
  description: React.ReactNode;
  docsLabel: string;
  docsHref: string;
}

interface ApiStepProps {
  snippets: SnippetSet;
  consoleRequest: string;
  consoleComment: string;
  infoPanel: InfoPanelProps;
  step: WizardStep;
  path: VectorPath;
}

export const ApiStep = ({
  snippets,
  consoleRequest,
  consoleComment,
  infoPanel,
  step,
  path,
}: ApiStepProps) => {
  const {
    services: { application, share, console: consolePlugin },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { elasticsearchUrl, apiKey } = useOnboardingCredentials();
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [isLanguagePopoverOpen, setIsLanguagePopoverOpen] = useState(false);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

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
    <EuiPanel paddingSize="none" hasBorder css={{ maxWidth: euiTheme.base * 52 }}>
      <EuiPanel paddingSize="s" hasShadow={false} color="transparent">
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          responsive={false}
        >
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
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiToolTip
                      content={i18n.translate('vectordbOnboarding.wizard.moreActions', {
                        defaultMessage: 'More actions',
                      })}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        iconType="boxesVertical"
                        color="text"
                        aria-label={i18n.translate('vectordbOnboarding.wizard.moreActions', {
                          defaultMessage: 'More actions',
                        })}
                        onClick={() => setIsActionsPopoverOpen(!isActionsPopoverOpen)}
                        data-test-subj="vectordbWizardMoreActions"
                        data-telemetry-id={`${telemetryPrefix}-openMoreActions`}
                      />
                    </EuiToolTip>
                  }
                  isOpen={isActionsPopoverOpen}
                  closePopover={() => setIsActionsPopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downRight"
                  aria-label={i18n.translate('vectordbOnboarding.wizard.actionsMenu', {
                    defaultMessage: 'Code actions menu',
                  })}
                >
                  <EuiContextMenuPanel
                    items={[
                      <TryInConsoleButton
                        key="runInConsole"
                        request={requestWithComment}
                        application={application}
                        consolePlugin={consolePlugin}
                        sharePlugin={share}
                        type="contextMenuItem"
                        iconType="play"
                        onClick={() => setIsActionsPopoverOpen(false)}
                        data-test-subj="vectordbWizardRunInConsole"
                        telemetryId={`${telemetryPrefix}-runInConsole`}
                      />,
                    ]}
                  />
                </EuiPopover>
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
      <EuiHorizontalRule margin="none" />
      <EuiPanel hasShadow={false} color="subdued">
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiIcon type="documentation" aria-hidden={true} />
          <EuiTitle size="xs">
            <h3>{infoPanel.title}</h3>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{infoPanel.description}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiLink
          href={infoPanel.docsHref}
          external
          target="_blank"
          data-test-subj="vectordbWizardInfoPanelDocLink"
          data-telemetry-id={`${telemetryPrefix}-infoPanelDocLink`}
        >
          {infoPanel.docsLabel}
        </EuiLink>
      </EuiPanel>
    </EuiPanel>
  );
};
