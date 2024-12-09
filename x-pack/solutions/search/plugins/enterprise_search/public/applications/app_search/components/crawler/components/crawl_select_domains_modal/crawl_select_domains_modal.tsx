/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiNotificationBadge,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';

import { CrawlerLogic } from '../../crawler_logic';

import { CrawlSelectDomainsModalLogic } from './crawl_select_domains_modal_logic';
import { SimplifiedSelectable } from './simplified_selectable';

import './crawl_select_domains_modal.scss';

export const CrawlSelectDomainsModal: React.FC = () => {
  const { domains } = useValues(CrawlerLogic);
  const domainUrls = domains.map((domain) => domain.url);

  const crawlSelectDomainsModalLogic = CrawlSelectDomainsModalLogic({ domains });
  const { isDataLoading, isModalVisible, selectedDomainUrls } = useValues(
    crawlSelectDomainsModalLogic
  );
  const { hideModal, onSelectDomainUrls } = useActions(crawlSelectDomainsModalLogic);

  const { startCrawl } = useActions(CrawlerLogic);

  if (!isModalVisible) {
    return null;
  }

  return (
    <EuiModal onClose={hideModal} className="crawlSelectDomainsModal">
      <EuiModalHeader>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem>
            <EuiModalHeaderTitle>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlSelectDomainsModal.modalHeaderTitle',
                {
                  defaultMessage: 'Crawl select domains',
                }
              )}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiNotificationBadge
            size="m"
            color={selectedDomainUrls.length > 0 ? 'accent' : 'subdued'}
          >
            {selectedDomainUrls.length}
          </EuiNotificationBadge>
          <EuiFlexItem grow={false}>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.crawlSelectDomainsModal.selectedDescriptor',
              {
                defaultMessage: 'selected',
              }
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <SimplifiedSelectable
          options={domainUrls}
          selectedOptions={selectedDomainUrls}
          onChange={onSelectDomainUrls}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={hideModal}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
        <EuiButton
          fill
          onClick={() => {
            startCrawl({ domain_allowlist: selectedDomainUrls });
          }}
          disabled={selectedDomainUrls.length === 0}
          isLoading={isDataLoading}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.crawlSelectDomainsModal.startCrawlButtonLabel',
            {
              defaultMessage: 'Apply and crawl now',
            }
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
