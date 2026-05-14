/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useGetSecuritySolutionUrl } from '../../../../../common/components/link_to';
import { getCaseDetailsUrl } from '../../../../../common/components/link_to/redirect_to_case';
import { useKibana } from '../../../../../common/lib/kibana';
import { APP_ID, SecurityPageName } from '../../../../../../common/constants';

const SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.relatedCases.title',
  { defaultMessage: 'Related cases' }
);

const EMPTY_STATE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.relatedCases.emptyState',
  { defaultMessage: 'No cases found for this entity.' }
);

const ERROR_STATE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.relatedCases.errorState',
  { defaultMessage: 'Unable to load related cases.' }
);

interface RelatedCase {
  id: string;
  title: string;
  status: string;
}

interface RelatedCasesSectionProps {
  /** The entity display name (e.g. user.name or host.name) used to search cases */
  entityName: string;
  /** Optional entity store ID for future first-class entity attachment support */
  entityStoreId?: string;
}

/**
 * POC: Shows cases related to an entity by searching case titles/descriptions
 * for the entity name. This is a stepping stone toward first-class entity
 * attachments via the unified registry framework (Christine's RFC).
 */
export const RelatedCasesSection: React.FC<RelatedCasesSectionProps> = ({
  entityName,
  entityStoreId: _entityStoreId,
}) => {
  const { cases } = useKibana().services;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const getCaseHref = useCallback(
    (caseId: string) =>
      getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.case,
        path: getCaseDetailsUrl({ id: caseId }),
      }),
    [getSecuritySolutionUrl]
  );
  const [relatedCases, setRelatedCases] = useState<RelatedCase[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(entityName?.trim()));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const trimmedName = entityName?.trim();
    if (!trimmedName) {
      setRelatedCases([]);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const findCases = cases?.api?.cases?.find;
    if (!findCases) {
      setRelatedCases([]);
      setIsLoading(false);
      setHasError(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    findCases(
      {
        search: trimmedName,
        searchFields: ['title', 'description'],
        owner: [APP_ID],
        perPage: 5,
        sortField: 'createdAt',
        sortOrder: 'desc',
      }
      // AbortSignal omitted for POC simplicity
    )
      .then((response) => {
        if (!cancelled) {
          setRelatedCases(
            (response.cases ?? []).map((c) => ({
              id: c.id,
              title: c.title,
              status: c.status,
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // cases client is created once at Cases plugin start; entityName drives refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityName]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>{SECTION_TITLE}</h3>
        </EuiTitle>
      </EuiFlexItem>

      {isLoading && (
        <EuiFlexItem>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      )}

      {!isLoading && hasError && (
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {ERROR_STATE}
          </EuiText>
        </EuiFlexItem>
      )}

      {!isLoading && !hasError && relatedCases.length === 0 && (
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {EMPTY_STATE}
          </EuiText>
        </EuiFlexItem>
      )}

      {!isLoading &&
        !hasError &&
        relatedCases.map((c) => (
          <EuiFlexItem key={c.id}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiBadge color={c.status === 'open' ? 'danger' : 'default'}>{c.status}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink href={getCaseHref(c.id)} external>
                  <EuiText size="s">{c.title}</EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
};
