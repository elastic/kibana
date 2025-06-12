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

import KeywordSearchImage from '../../../public/assets/keyword_search.svg';

export const KeywordSearch: React.FC = () => (
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
                  {i18n.translate('xpack.searchHomepage.aiSearchCapabilities.keywordSearch.title', {
                    defaultMessage: 'Boost results with keyword search.',
                  })}
                </span>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              {i18n.translate(
                'xpack.searchHomepage.aiSearchCapabilities.keywordSearch.description',
                {
                  defaultMessage:
                    'Leverage traditional text matching techniques to quickly retrieve precise keyword-based results from your data.',
                }
              )}
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
                            defaultMessage: 'Fast text matching and filtering capabilities',
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
                            defaultMessage: 'Optimized for large-scale data retrieval',
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
                            defaultMessage: 'Easily integrate with existing keyword indices',
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
