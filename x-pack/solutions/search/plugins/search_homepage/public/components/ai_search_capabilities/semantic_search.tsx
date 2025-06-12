/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiImage,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CREATE_INDEX } from '../../../common/constants';

import SemanticSearchImage from '../../../public/assets/semantic_search.svg';
import { useKibana } from '../../hooks/use_kibana';

export const SemanticSearch: React.FC = () => {
  const { http } = useKibana().services;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiSpacer size="m" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiImage
              src={SemanticSearchImage}
              alt={i18n.translate(
                'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.imageAlt',
                {
                  defaultMessage: 'Semantic Search',
                }
              )}
              size="s"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <span>
                    {i18n.translate(
                      'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.title',
                      {
                        defaultMessage:
                          'Enhance search accuracy with advanced semantic capabilities.',
                      }
                    )}
                  </span>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.description',
                    {
                      defaultMessage:
                        "Leverage the semantic_text field along with Elastic's advanced ELSER machine learning model for enhanced data analysis.",
                    }
                  )}
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFlexGroup direction="column" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="m">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="checkInCircleFilled" color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          {i18n.translate(
                            'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.firstLine',
                            {
                              defaultMessage:
                                'Use Elastic’s inference service or connect your own model provider',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="m">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="checkInCircleFilled" color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          {i18n.translate(
                            'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.SecondLine',
                            {
                              defaultMessage: 'Default chunking strategies or customize your own',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="m">
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="checkInCircleFilled" color="subdued" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          {i18n.translate(
                            'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.ThirdLine',
                            {
                              defaultMessage:
                                'Combine semantic capabilities with traditional search methods.',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButton
                    iconType="plusInCircle"
                    href={http.basePath.prepend(CREATE_INDEX)}
                    target="_blank"
                    data-test-subj="createSemanticOptimizedIndexButton"
                  >
                    {i18n.translate(
                      'xpack.searchHomepage.aiSearchCapabilities.semanticSearch.createSemanticOptimizedIndex',
                      {
                        defaultMessage: 'Create a semantic optimized index',
                      }
                    )}
                  </EuiButton>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
