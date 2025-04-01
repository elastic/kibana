/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { docLinks } from '../../../common/doc_links';

interface EmptyPromptProps {
  getStartedAction: () => void;
}
export const EmptyPrompt: React.FC<EmptyPromptProps> = ({ getStartedAction }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup direction="row" gutterSize="l" alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false}>
        <div
          css={css`
            max-width: calc(${euiTheme.size.base} * 50);
          `}
        >
          <EuiSplitPanel.Outer grow={false}>
            <EuiSplitPanel.Inner paddingSize="l">
              <EuiSpacer size="m" />
              <EuiTitle size="l">
                <h2>
                  <FormattedMessage
                    id="xpack.queryRules.emptyPrompt.title"
                    defaultMessage="Power a customized search experience"
                  />
                </h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <p>
                      <FormattedMessage
                        id="xpack.queryRules.emptyPrompt.subtitle"
                        defaultMessage="Create and maintain business logic in your query rules to  provide targeted results based on query parameters."
                      />
                    </p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <div>
                    <EuiButton
                      data-test-subj="searchSynonymsEmptyPromptGetStartedButton"
                      color="primary"
                      fill
                      onClick={getStartedAction}
                    >
                      <FormattedMessage
                        id="xpack.queryRules.emptyPrompt.getStartedButton"
                        defaultMessage="Get started"
                      />
                    </EuiButton>
                  </div>
                </EuiFlexItem>
                <EuiHorizontalRule margin="m" />
                <EuiFlexItem grow={false}>
                  <EuiFlexGrid columns={3} direction="row">
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup responsive={false} gutterSize="xs" direction="column">
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup responsive={false} gutterSize="s">
                            <EuiFlexItem grow={false}>
                              <EuiIcon type="check" />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiTitle size="xxs">
                                <h5>
                                  <FormattedMessage
                                    id="xpack.queryRules.emptyPrompt.pinExclude.title"
                                    defaultMessage="Pin and exclude documents"
                                  />
                                </h5>
                              </EuiTitle>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s" color="subdued">
                            <p>
                              <FormattedMessage
                                id="xpack.queryRules.emptyPrompt.pinExclude.description"
                                defaultMessage="Provide customized result ranking based on business-logic rules."
                              />
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup responsive={false} gutterSize="xs" direction="column">
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup responsive={false} gutterSize="s">
                            <EuiFlexItem grow={false}>
                              <EuiIcon type="check" />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiTitle size="xxs">
                                <h5>
                                  <FormattedMessage
                                    id="xpack.queryRules.emptyPrompt.targetQueryParameters.title"
                                    defaultMessage="Target query parameters"
                                  />
                                </h5>
                              </EuiTitle>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s" color="subdued">
                            <p>
                              <FormattedMessage
                                id="xpack.queryRules.emptyPrompt.targetQueryParameters.description"
                                defaultMessage="Use metadata from your application to determine condition-based results."
                              />
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>

                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup responsive={false} gutterSize="xs" direction="column">
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup responsive={false} gutterSize="s">
                            <EuiFlexItem grow={false}>
                              <EuiIcon type="check" />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiTitle size="xxs">
                                <h5>
                                  <FormattedMessage
                                    id="xpack.queryRules.emptyPrompt.collaborateMantain.title"
                                    defaultMessage="Collaborate and maintain"
                                  />
                                </h5>
                              </EuiTitle>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText size="s" color="subdued">
                            <p>
                              <FormattedMessage
                                id="xpack.queryRules.emptyPrompt.collaborateMantain.description"
                                defaultMessage="Update your query rules and export the updates to code for easy developer collaboration."
                              />
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGrid>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner color="subdued" paddingSize="l">
              <>
                <EuiTitle size="xxs">
                  <span>
                    <FormattedMessage
                      id="xpack.queryRules.emptyPrompt.footer"
                      defaultMessage="Prefer to use the APIs?"
                    />
                  </span>
                </EuiTitle>
                &nbsp;
                <EuiLink
                  data-test-subj="searchSynonymsEmptyPromptFooterLink"
                  href={docLinks.queryRulesApi}
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.queryRules.emptyPrompt.footerLink"
                    defaultMessage="Query Rules API documentation"
                  />
                </EuiLink>
              </>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
