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

import VectorSearchImage from '../../../public/assets/vector_search.svg';

export const VectorSearch: React.FC = () => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem grow={false}>
      <EuiSpacer size="m" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiImage
            src={VectorSearchImage}
            alt={i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch.imageAlt', {
              defaultMessage: 'Vector Search',
            })}
            size="s"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <span>
                  {i18n.translate('xpack.searchHomepage.aiSearchCapabilities.vectorSearch.title', {
                    defaultMessage: 'Supercharge retrieval with vector search.',
                  })}
                </span>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              {i18n.translate(
                'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.description',
                {
                  defaultMessage:
                    'Store and search dense vector representations of your data for similarity-based retrieval and advanced AI-powered search experiences.',
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
                          'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.firstLine',
                          {
                            defaultMessage: 'Supports multiple vector similarity algorithms',
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
                          'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.secondLine',
                          {
                            defaultMessage: 'Integrates with popular ML frameworks',
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
                          'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.thirdLine',
                          {
                            defaultMessage: 'Scale to billions of vectors with efficient indexing',
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
                <EuiButton iconType="plusInCircle" size="s">
                  {i18n.translate(
                    'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.createVectorIndex',
                    {
                      defaultMessage: 'Create a vector index',
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
