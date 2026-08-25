/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_CASE_IDS } from '@kbn/rule-data-utils';
import { useFetchBulkCases } from '../../../hooks/use_fetch_bulk_cases';
import { useCaseLinks } from '../hooks/use_case_links';
import { type TopAlert } from '../../../typings/alerts';

const caseLinkStyle = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
`;

interface Props {
  alert: TopAlert | null;
}

export function CaseLinks({ alert }: Props) {
  const { cases } = useFetchBulkCases({ ids: alert?.fields[ALERT_CASE_IDS] || [] });
  const { firstCaseLink, casesOverviewLink } = useCaseLinks(cases);
  if (!cases?.length) return null;
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.cases.title"
              defaultMessage="{numCases, plural, =1 {Case} other {Cases}}:"
              values={{ numCases: cases.length }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {!!firstCaseLink ? (
            <EuiLink
              data-test-subj="xpack.observability.pages.alertDetails.cases.caseLink"
              href={firstCaseLink}
              css={caseLinkStyle}
              external={false}
            >
              {cases[0].title}
            </EuiLink>
          ) : (
            <EuiText size="s" color="subdued" css={caseLinkStyle}>
              {cases[0].title}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {cases.length > 1 &&
            (!!casesOverviewLink ? (
              <EuiLink
                data-test-subj="xpack.observability.pages.alertDetails.cases.goToCasesOverview"
                href={casesOverviewLink}
                target="_blank"
                external={false}
              >
                <FormattedMessage
                  id="xpack.observability.pages.alertDetails.cases.count"
                  defaultMessage="+ {count} more"
                  values={{ count: cases.length - 1 }}
                />
              </EuiLink>
            ) : (
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.observability.pages.alertDetails.cases.count"
                  defaultMessage="+ {count} more"
                  values={{ count: cases.length - 1 }}
                />
              </EuiText>
            ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}
