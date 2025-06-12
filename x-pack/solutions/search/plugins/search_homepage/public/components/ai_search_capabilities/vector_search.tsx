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

import VectorSearchImage from '../../../public/assets/vector_search.svg';
import { useKibana } from '../../hooks/use_kibana';

export const VectorSearch: React.FC = () => {
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
              src={VectorSearchImage}
              alt={i18n.translate(
                'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.imageAlt',
                {
                  defaultMessage: 'Vector Search',
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
                      'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.title',
                      {
                        defaultMessage: 'Store and search your vector embeddings',
                      }
                    )}
                  </span>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                {i18n.translate(
                  'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.description',
                  {
                    defaultMessage:
                      'Use Elasticsearch as a datastore for vector embeddings andenable lightning-fast searches and insights.',
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
                              defaultMessage:
                                'A single solution to generate, store and search your vector embeddings. ',
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
                              defaultMessage:
                                'Utilize the dense_vector field type for approximate kNN searches.',
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
                              defaultMessage:
                                'Choose from several memory quantization strategies to reduce bloat.',
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
                    href={http.basePath.prepend(CREATE_INDEX)}
                    target="_blank"
                    data-test-subj="createVectorIndexButton"
                  >
                    {i18n.translate(
                      'xpack.searchHomepage.aiSearchCapabilities.vectorSearch.createVectorIndex',
                      {
                        defaultMessage: 'Create a vector optimized index',
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
