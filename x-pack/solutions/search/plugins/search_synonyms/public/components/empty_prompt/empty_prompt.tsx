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
                    id="xpack.searchSynonyms.emptyPrompt.title"
                    defaultMessage="Search with synonyms"
                  />
                </h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiText size="m">
                    <p>
                      <FormattedMessage
                        id="xpack.searchSynonyms.emptyPrompt.subtitle"
                        defaultMessage="Improve search relevance by matching terms that express the same concept."
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
                        id="xpack.searchSynonyms.emptyPrompt.getStartedButton"
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
                                    id="xpack.searchSynonyms.emptyPrompt.improveSearchRelevance.title"
                                    defaultMessage="Expand search coverage"
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
                                id="xpack.searchSynonyms.emptyPrompt.improveSearchRelevance.description"
                                defaultMessage="Include related terms your users actually use."
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
                                    id="xpack.searchSynonyms.emptyPrompt.domainSpecific.title"
                                    defaultMessage="Match domain-specific terms"
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
                                id="xpack.searchSynonyms.emptyPrompt.domainSpecific.description"
                                defaultMessage="Connect industry terms with common search phrases."
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
                                    id="xpack.searchSynonyms.emptyPrompt.improvePerformance.title"
                                    defaultMessage="Optimize performance"
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
                                id="xpack.searchSynonyms.emptyPrompt.improvedPerformance.description"
                                defaultMessage="Uses the built-in synonyms API for improved performance and flexibility."
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
                      id="xpack.searchSynonyms.emptyPrompt.footer"
                      defaultMessage="Prefer to use the APIs?"
                    />
                  </span>
                </EuiTitle>
                &nbsp;
                <EuiLink
                  data-test-subj="searchSynonymsEmptyPromptFooterLink"
                  href={docLinks.synonymsApi}
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.searchSynonyms.emptyPrompt.footerLink"
                    defaultMessage="Synonyms API documentation"
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
