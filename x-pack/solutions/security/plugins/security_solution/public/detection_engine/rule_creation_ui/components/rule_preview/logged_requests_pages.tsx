/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import { useEuiPaddingSize } from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine';
import { OptimizedAccordion } from './optimized_accordion';
import { useAccordionStyling } from './use_accordion_styling';
import { LoggedRequestsQuery } from './logged_requests_query';

const ruleRequestsTypesMap = {
  query: {
    findDocuments: 'pageDelimiter',
  },
  saved_query: {
    findDocuments: 'pageDelimiter',
  },
  threshold: {
    findThresholdBuckets: 'pageDelimiter',
  },
  new_terms: {
    findAllTerms: 'pageDelimiter',
  },
};

type RuleTypesWithPages = keyof typeof ruleRequestsTypesMap;

export const isPageViewSupported = (ruleType: Type): ruleType is RuleTypesWithPages =>
  ruleType in ruleRequestsTypesMap;

const hasRequestType = (
  ruleType: RuleTypesWithPages,
  requestType: string
): requestType is keyof (typeof ruleRequestsTypesMap)[typeof ruleType] =>
  requestType in ruleRequestsTypesMap[ruleType];

const transformRequestsToPages = (
  requests: RulePreviewLoggedRequest[],
  ruleType: RuleTypesWithPages
): RulePreviewLoggedRequest[][] => {
  const pages: RulePreviewLoggedRequest[][] = [];
  requests.forEach((request) => {
    if (pages.length === 0) {
      pages.push([request]);
    } else if (
      request.request_type &&
      hasRequestType(ruleType, request.request_type) &&
      ruleRequestsTypesMap[ruleType][request.request_type] === 'pageDelimiter'
    ) {
      pages.push([request]);
    } else {
      pages.at(-1)?.push(request);
    }
  });

  return pages;
};

const LoggedRequestsPagesComponent: FC<{
  requests: RulePreviewLoggedRequest[];
  ruleType: RuleTypesWithPages;
}> = ({ requests, ruleType }) => {
  const cssStyles = useAccordionStyling();
  const paddingLarge = useEuiPaddingSize('l');
  const pages = transformRequestsToPages(requests, ruleType);

  return (
    <>
      {pages.map((pageRequests, key) => (
        <OptimizedAccordion
          key={key}
          id={`preview-logged-requests-page-accordion-${key}`}
          data-test-subj="preview-logged-requests-page-accordion"
          buttonContent={
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.queryPreview.loggedRequestPageLabel"
              defaultMessage="Page {pageNumber} of search queries"
              values={{ pageNumber: key + 1 }}
            />
          }
          borders="horizontal"
          css={css`
            margin-left: ${paddingLarge};
            ${cssStyles}
          `}
        >
          {pageRequests.map((request, requestKey) => (
            <LoggedRequestsQuery key={requestKey} {...request} />
          ))}
        </OptimizedAccordion>
      ))}
    </>
  );
};

export const LoggedRequestsPages = React.memo(LoggedRequestsPagesComponent);
LoggedRequestsPages.displayName = 'LoggedRequestsPages';
