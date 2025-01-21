/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { useEuiPaddingSize } from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine';
import { OptimizedAccordion } from './optimized_accordion';
import { useAccordionStyling } from './use_accordion_styling';
import { LoggedRequestsQuery } from './logged_requests_query';

const ruleRequestsTypesMap: Partial<Record<Type, Record<string, unknown>>> = {
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

export const isPageViewSupported = (ruleType: Type) => Boolean(ruleRequestsTypesMap[ruleType]);

const transformRequestsToPages = (
  requests: RulePreviewLoggedRequest[],
  ruleType: Type
): RulePreviewLoggedRequest[][] => {
  const pages: RulePreviewLoggedRequest[][] = [];
  requests.forEach((request) => {
    if (pages.length === 0) {
      pages.push([request]);
    } else if (
      request.request_type &&
      ruleRequestsTypesMap[ruleType]?.[request.request_type] === 'pageDelimiter'
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
  ruleType: Type;
}> = ({ requests, ruleType }) => {
  const cssStyles = useAccordionStyling();
  const paddingLarge = useEuiPaddingSize('l');
  const pages = transformRequestsToPages(requests, ruleType);

  return (
    <>
      {pages.map((pageRequests, key) => (
        <OptimizedAccordion
          id={`preview-logged-requests-page-accordion-${key}`}
          data-test-subj="preview-logged-requests-page-accordion"
          buttonContent={`Page ${key + 1} of search queries`}
          borders="horizontal"
          css={{
            'margin-left': paddingLarge,
            ...cssStyles,
          }}
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
