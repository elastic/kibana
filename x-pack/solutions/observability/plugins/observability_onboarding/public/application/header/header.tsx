/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import React, { useState } from 'react';

export function Header() {
  const { euiTheme } = useEuiTheme();
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  return (
    <>
      <EuiPageTemplate.Section
        paddingSize="none"
        css={css`
          border-bottom: ${euiTheme.border.thin};
          padding-block: 24px;
        `}
        grow={false}
        restrictWidth
      >
        <EuiFlexGroup alignItems="center" gutterSize="xl" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="l" data-test-subj="obltOnboardingHomeTitle">
              <h1>
                <FormattedMessage
                  id="xpack.observability_onboarding.experimentalOnboardingFlow.addObservabilityDataTitleLabel"
                  defaultMessage="Add Observability data"
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.observability_onboarding.experimentalOnboardingFlow.startIngestingDataIntoTextLabel"
                defaultMessage="Connect your systems and get full visibility into logs, metrics, and traces."
              />
            </EuiText>
          </EuiFlexItem>

          {/* Compact AI panel */}
          <EuiFlexItem grow={false}>
            <div
              css={css`
                background-color: ${euiTheme.colors.backgroundBaseSubdued};
                border: ${euiTheme.border.thin};
                border-radius: 6px;
                padding: 16px 20px;
                min-width: 420px;
              `}
            >
              <div>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>Ingest data using AI</h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <div css={css`display: flex; align-items: center; position: relative; width: ${22 + 2 * 14}px; height: 22px;`}>
                      {[
                        { label: 'Claude', url: 'https://cdn.simpleicons.org/claude' },
                        { label: 'Cursor', url: 'https://cdn.simpleicons.org/cursor' },
                        { label: 'VS Code', url: 'https://cdn.worldvectorlogo.com/logos/visual-studio-code-1.svg' },
                      ].map((ide, i) => (
                        <div
                          key={ide.label}
                          title={ide.label}
                          style={{
                            position: 'absolute',
                            left: i * 14,
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            backgroundColor: euiTheme.colors.backgroundBasePlain,
                            border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            zIndex: 3 - i,
                          }}
                        >
                          <img
                            src={ide.url}
                            alt={ide.label}
                            style={{ width: 13, height: 13, objectFit: 'contain' }}
                          />
                        </div>
                      ))}
                    </div>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                <EuiText size="s" color="subdued">
                  <p css={css`margin: 0 !important;`}>
                    Use your preferred coding agent or chat with Elastic AI Agent.
                  </p>
                </EuiText>
              </div>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexStart" responsive={false} >
                <EuiFlexItem grow={false}>
                  <EuiButton size="s" color="text" onClick={() => setIsSkillsModalOpen(true)}>
                    Install Elastic skills
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="productAgent"
                    color="primary"
                    css={css`
                      position: relative;
                      &:hover, &:focus {
                        background: linear-gradient(165deg, rgba(11, 100, 221, 0.08) 0%, rgba(129, 68, 204, 0.08) 100%) !important;
                        color: rgb(129, 68, 204) !important;
                        text-decoration: none;
                      }
                      &:hover span, &:focus span {
                        background: linear-gradient(165deg, rgb(11, 100, 221) 2.98%, rgb(129, 68, 204) 66.24%);
                        -webkit-background-clip: text;
                        background-clip: text;
                        -webkit-text-fill-color: transparent;
                      }
                      &::after {
                        content: '';
                        position: absolute;
                        pointer-events: none;
                        inset: 0px;
                        border-radius: inherit;
                        padding: 1px;
                        background: linear-gradient(165deg, rgb(11, 100, 221) 2.98%, rgb(129, 68, 204) 66.24%);
                        -webkit-mask:
                          linear-gradient(#fff 0px, #fff 0px) content-box,
                          linear-gradient(#fff 0px, #fff 0px);
                        -webkit-mask-composite: xor;
                        mask:
                          linear-gradient(#fff 0px, #fff 0px) content-box,
                          linear-gradient(#fff 0px, #fff 0px);
                        mask-composite: exclude;
                      }
                    `}
                  >
                    Start chat
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>

      {isSkillsModalOpen && (
        <EuiOverlayMask>
          <EuiModal onClose={() => setIsSkillsModalOpen(false)} style={{ maxWidth: 560 }}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>Copy prompt to your coding agent</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiText size="s" color="subdued">
                <p>Paste this prompt into any coding agent to install the Elastic Observability onboarding skills.</p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiCodeBlock language="markdown" fontSize="s" paddingSize="m" isCopyable>
                {`Install the observability onboarding skill:\n\`\`\`sh\nnpx skills add elastic/agent-skills --skill observability-onboarding -y\n\`\`\`\n\nHelp me get started with Elastic Observability.`}
              </EuiCodeBlock>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButtonEmpty onClick={() => setIsSkillsModalOpen(false)}>Close</EuiButtonEmpty>
              <EuiButton
                fill
                onClick={() => {
                  navigator.clipboard.writeText(
                    'Install the observability onboarding skill:\n```sh\nnpx skills add elastic/agent-skills --skill observability-onboarding -y\n```\n\nHelp me get started with Elastic Observability.'
                  );
                  setIsSkillsModalOpen(false);
                }}
              >
                Copy to clipboard
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );
}
