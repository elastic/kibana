/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSwitch,
  EuiSearchBar,
  EuiToolTip,
  EuiCode,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { handlePageChange } from '../../../shared/table_pagination';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';

// import { CannotConnect } from '../search_index/components/cannot_connect';
import { DefaultSettingsFlyout } from '../settings/default_settings_flyout';

import { DeleteIndexModal } from './delete_index_modal';
import { IndicesLogic } from './indices_logic';
import { IndicesTable } from './indices_table';
import './search_indices.scss';

export const baseBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.breadcrumb', {
    defaultMessage: 'Elasticsearch indices',
  }),
];

export const SearchIndices: React.FC = () => {
  const { fetchIndices, onPaginate, openDeleteModal, setIsFirstRequest } = useActions(IndicesLogic);
  const { meta, indices, hasNoIndices, isLoading, searchParams } = useValues(IndicesLogic);
  const [showHiddenIndices, setShowHiddenIndices] = useState(false);
  const [onlyShowSearchOptimizedIndices, setOnlyShowSearchOptimizedIndices] = useState(false);
  const [searchQuery, setSearchValue] = useState('');
  const { productFeatures, share } = useValues(KibanaLogic);
  const [showDefaultSettingsFlyout, setShowDefaultSettingsFlyout] = useState<boolean>(false);
  const createIndexUrl = share?.url.locators.get('SEARCH_CREATE_INDEX')?.useUrl({}) ?? '';

  useEffect(() => {
    // We don't want to trigger loading for each search query change, so we need this
    // flag to set if the call to backend is first request.
    setIsFirstRequest();
  }, []);

  useEffect(() => {
    fetchIndices({
      from: searchParams.from,
      onlyShowSearchOptimizedIndices,
      returnHiddenIndices: showHiddenIndices,
      searchQuery,
      size: searchParams.size,
    });
  }, [
    searchQuery,
    searchParams.from,
    searchParams.size,
    onlyShowSearchOptimizedIndices,
    showHiddenIndices,
  ]);

  const pageTitle =
    isLoading || hasNoIndices
      ? ''
      : i18n.translate('xpack.enterpriseSearch.content.searchIndices.searchIndices.pageTitle', {
          defaultMessage: 'Elasticsearch indices',
        });

  return (
    <>
      <DeleteIndexModal />
      <EnterpriseSearchContentPageTemplate
        pageChrome={baseBreadcrumbs}
        pageViewTelemetry="Search indices"
        isLoading={isLoading}
        pageHeader={
          hasNoIndices
            ? undefined
            : {
                pageTitle,
                rightSideGroupProps: {
                  gutterSize: 's',
                },
                rightSideItems: isLoading
                  ? []
                  : [
                      <EuiLinkTo
                        data-test-subj="create-new-index-button"
                        to={createIndexUrl}
                        shouldNotCreateHref
                        shouldNotPrepend
                      >
                        <EuiButton
                          iconType="plusInCircle"
                          color="primary"
                          fill
                          data-test-subj="entSearchContent-searchIndices-createButton"
                        >
                          {i18n.translate(
                            'xpack.enterpriseSearch.content.searchIndices.create.buttonTitle',
                            {
                              defaultMessage: 'Create a new index',
                            }
                          )}
                        </EuiButton>
                      </EuiLinkTo>,
                      ...(productFeatures.hasDefaultIngestPipeline
                        ? [
                            <EuiButton
                              color="primary"
                              data-test-subj="entSearchContent-searchIndices-defaultSettings"
                              onClick={() => setShowDefaultSettingsFlyout(true)}
                            >
                              {i18n.translate(
                                'xpack.enterpriseSearch.content.searchIndices.defaultSettings',
                                {
                                  defaultMessage: 'Default settings',
                                }
                              )}
                            </EuiButton>,
                          ]
                        : []),
                    ],
              }
        }
      >
        {productFeatures.hasDefaultIngestPipeline && showDefaultSettingsFlyout && (
          <DefaultSettingsFlyout closeFlyout={() => setShowDefaultSettingsFlyout(false)} />
        )}
        {!hasNoIndices ? (
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle>
                    <h2>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.searchIndices.searchIndices.tableTitle',
                        {
                          defaultMessage: 'Available indices',
                        }
                      )}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        checked={showHiddenIndices}
                        label={i18n.translate(
                          'xpack.enterpriseSearch.content.searchIndices.searchIndices.includeHidden.label',
                          {
                            defaultMessage: 'Show hidden indices',
                          }
                        )}
                        onChange={(event) => setShowHiddenIndices(event.target.checked)}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={
                          <FormattedMessage
                            id="xpack.enterpriseSearch.content.searchIndices.searchIndices.onlyCrawlerIndices.tooltipContent"
                            defaultMessage="Crawler indices are prefixed with {code}. Connector and ingestion API indices created prior to 8.13.0 may also have this prefix, but it is not longer required."
                            values={{ code: <EuiCode>search-</EuiCode> }}
                          />
                        }
                      >
                        <EuiSwitch
                          checked={onlyShowSearchOptimizedIndices}
                          label={i18n.translate(
                            'xpack.enterpriseSearch.content.searchIndices.searchIndices.onlyCrawlerIndices.label',
                            {
                              defaultMessage: 'Only show crawler indices',
                            }
                          )}
                          onChange={(event) =>
                            setOnlyShowSearchOptimizedIndices(event.target.checked)
                          }
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                    <EuiFlexItem className="entSearchIndicesSearchBar">
                      <EuiSearchBar
                        query={searchQuery}
                        box={{
                          incremental: true,
                          placeholder: i18n.translate(
                            'xpack.enterpriseSearch.content.searchIndices.searchIndices.searchBar.placeHolder',
                            {
                              defaultMessage: 'Filter Elasticsearch indices',
                            }
                          ),
                        }}
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.content.searchIndices.searchIndices.searchBar.ariaLabel',
                          {
                            defaultMessage: 'Filter Elasticsearch indices',
                          }
                        )}
                        onChange={(event) => setSearchValue(event.queryText)}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <IndicesTable
                indices={indices}
                meta={meta}
                onChange={handlePageChange(onPaginate)}
                onDelete={openDeleteModal}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <AddContentEmptyPrompt />
        )}
      </EnterpriseSearchContentPageTemplate>
    </>
  );
};
