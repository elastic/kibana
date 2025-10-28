/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';

import { css } from '@emotion/react';
import { useActions, useValues } from 'kea';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX } from '../../../../../common/constants';
import { stripSearchPrefix } from '../../../../../common/utils/strip_search_prefix';

import { KibanaLogic } from '../../../shared/kibana';

import { mappingsWithPropsApiLogic } from '../../api/mappings/mappings_logic';

import type { AccessControlSelectorOption } from './components/access_control_index_selector/access_control_index_selector';
import { AccessControlIndexSelector } from './components/access_control_index_selector/access_control_index_selector';
import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';

export const SearchIndexIndexMappings: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { hasDocumentLevelSecurityFeature, isHiddenIndex } = useValues(IndexViewLogic);
  const { indexMappingComponent, productFeatures } = useValues(KibanaLogic);

  const IndexMappingComponent = useMemo(() => indexMappingComponent, []);

  const [selectedIndexType, setSelectedIndexType] =
    useState<AccessControlSelectorOption['value']>('content-index');
  const indexToShow =
    selectedIndexType === 'content-index'
      ? indexName
      : stripSearchPrefix(indexName, CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX);
  const { makeRequest: makeMappingRequest } = useActions(mappingsWithPropsApiLogic(indexToShow));
  const { error } = useValues(mappingsWithPropsApiLogic(indexToShow));
  const shouldShowAccessControlSwitch =
    hasDocumentLevelSecurityFeature && productFeatures.hasDocumentLevelSecurityEnabled;
  const isAccessControlIndexNotFound =
    shouldShowAccessControlSwitch && error?.body?.statusCode === 404;

  useEffect(() => {
    makeMappingRequest({ indexName: indexToShow });
  }, [indexToShow, indexName]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {shouldShowAccessControlSwitch && (
              <EuiFlexItem
                grow={false}
                css={css`
                  width: 100%;
                `}
              >
                <AccessControlIndexSelector
                  fullWidth
                  onChange={setSelectedIndexType}
                  valueOfSelected={selectedIndexType}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow>
              {isAccessControlIndexNotFound ? (
                <EuiCallOut
                  announceOnMount
                  size="m"
                  title={i18n.translate(
                    'xpack.enterpriseSearch.content.searchIndex.mappings.noIndex.title',
                    { defaultMessage: 'Access Control Index not found' }
                  )}
                  iconType="info"
                >
                  <p>
                    {i18n.translate('xpack.enterpriseSearch.content.searchIndex.mappings.noIndex', {
                      defaultMessage:
                        "An Access Control Index won't be created until you enable document-level security and run your first access control sync.",
                    })}
                  </p>
                </EuiCallOut>
              ) : (
                <>
                  {IndexMappingComponent ? (
                    <IndexMappingComponent
                      index={{
                        aliases: [],
                        hidden: isHiddenIndex,
                        isFrozen: false,
                        name: indexToShow,
                      }}
                    />
                  ) : (
                    <EuiCallOut
                      announceOnMount
                      color="danger"
                      iconType="warn"
                      title={i18n.translate(
                        'xpack.enterpriseSearch.content.searchIndex.mappings.noMappingsComponent',
                        { defaultMessage: 'Mappings component not found' }
                      )}
                    />
                  )}
                </>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
