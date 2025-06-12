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

import KeywordSearchImage from '../../../public/assets/keyword_search.svg';
import { useKibana } from '../../hooks/use_kibana';

export const KeywordSearch: React.FC = () => {
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
              src={KeywordSearchImage}
              alt={i18n.translate(
                'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.imageAlt',
                {
                  defaultMessage: 'Keyword Search',
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
                      'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.title',
                      {
                        defaultMessage:
                          'Setup your application with Elasticsearch’s full-text search capabilities',
                      }
                    )}
                  </span>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.description',
                    {
                      defaultMessage:
                        'Use a semantic_text field and Elastic’s built-in ELSER machine learning model.',
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
                            'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.firstLine',
                            {
                              defaultMessage: 'Take advantage of EIS...',
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
                            'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.secondLine',
                            {
                              defaultMessage: 'Hybrid search...',
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
                            'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.thirdLine',
                            {
                              defaultMessage: 'Hybrid search...',
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
                    size="s"
                    data-test-subj="createKeywordIndexButton"
                  >
                    {i18n.translate(
                      'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.createKeywordIndex',
                      {
                        defaultMessage: 'Create a keyword index',
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
