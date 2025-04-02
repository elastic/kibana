/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
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
  transparentize,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { docLinks } from '../../../common/doc_links';

import queryRulesImg from '../../assets/query-rules-context-alt.svg';

interface EmptyPromptProps {
  getStartedAction: () => void;
}
export const EmptyPrompt: React.FC<EmptyPromptProps> = ({ getStartedAction }) => {
  const { euiTheme } = useEuiTheme();
  const gradientOverlay = css({
    background: `linear-gradient(180deg, ${transparentize(
      euiTheme.colors.backgroundBasePlain,
      0
    )}, ${transparentize(euiTheme.colors.backgroundBasePlain, 1)} 100%)`,
    position: 'absolute',
    bottom: 0,
    height: '30px',
    width: '100%',
  });
  const imgProps = css({
    maxWidth: '360px',
    height: 'auto',
    margin: '0 auto',
  });

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
              <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
                <EuiFlexItem grow>
                  <EuiTitle size="l">
                    <h2>
                      <FormattedMessage
                        id="xpack.queryRules.emptyPrompt.title"
                        defaultMessage="Power a customized search experience"
                      />
                    </h2>
                  </EuiTitle>
                  <EuiSpacer size="m" />
                  <EuiText size="m">
                    <p>
                      <FormattedMessage
                        id="xpack.queryRules.emptyPrompt.subtitle"
                        defaultMessage="Create and maintain business logic in your query rules to  provide targeted results based on query parameters."
                      />
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup direction="row" gutterSize="m">
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="searchQueryRulesEmptyPromptGetStartedButton"
                        color="primary"
                        fill
                        onClick={getStartedAction}
                      >
                        <FormattedMessage
                          id="xpack.queryRules.emptyPrompt.getStartedButton"
                          defaultMessage="Get started"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        data-test-subj="searchQueryRulesEmptyPromptImportQueryRulesButton"
                        onClick={() => {}}
                      >
                        <FormattedMessage
                          id="xpack.queryRules.emptyPrompt.importQueryRulesButton"
                          defaultMessage="Import existing query rules"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem
                  grow
                  css={css`
                    position: relative;
                  `}
                >
                  <img src={queryRulesImg} alt="Query Rules" css={imgProps} />
                  <div css={gradientOverlay}>&nbsp;</div>
                </EuiFlexItem>
              </EuiFlexGroup>
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
                  data-test-subj="searchQueryRulesEmptyPromptFooterLink"
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
