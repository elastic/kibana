/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiIconTip, EuiLink, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_NAMESPACE_AGNOSTIC } from '@kbn/securitysolution-list-constants';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useAppUrl, useHttp } from '../../../../common/lib/kibana';
import { getCustomYaraSignaturesListPath } from '../../../../management/common/routing';
import { CustomYaraSignaturesApiClient } from '../../../../management/pages/custom_yara_signatures/service/api_client';
import {
  CUSTOM_YARA_SIGNATURE_ENTRY_ID_FIELD_NAME,
  CUSTOM_YARA_SIGNATURE_ENTRY_NAME_FIELD_NAME,
  CUSTOM_YARA_SIGNATURE_RULE_IDENTIFIER_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import {
  HIGHLIGHTED_FIELDS_CUSTOM_YARA_SIGNATURE_NOT_FOUND_TEST_ID,
  HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID,
} from './test_ids';

const SIGNATURE_NOT_FOUND_TOOLTIP = i18n.translate(
  'xpack.securitySolution.flyout.highlightedFields.customYaraSignatureNotFoundTooltip',
  {
    defaultMessage: 'YARA signature does not exist in the current space.',
  }
);

// The saved objects `_id` is prefixed with the saved object type
const buildEntryIdFilter = (entryId: string): string =>
  `${EXCEPTION_LIST_NAMESPACE_AGNOSTIC}.id:"${EXCEPTION_LIST_NAMESPACE_AGNOSTIC}:${entryId}"`;

export const isCustomYaraSignatureHighlightedField = (field: string): boolean =>
  [
    CUSTOM_YARA_SIGNATURE_ENTRY_NAME_FIELD_NAME,
    CUSTOM_YARA_SIGNATURE_RULE_IDENTIFIER_FIELD_NAME,
  ].includes(field);

const getEntryIdFromHit = (hit: DataTableRecord | undefined): string | undefined => {
  if (!hit) {
    return undefined;
  }

  const value = getFieldValue(hit, CUSTOM_YARA_SIGNATURE_ENTRY_ID_FIELD_NAME);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export interface CustomYaraSignatureHighlightedFieldLinkProps {
  /**
   * Source document used to resolve `rule.custom_yara_signature.entry_id`
   */
  hit?: DataTableRecord;
  children: ReactNode;
}

/**
 * Renders a highlighted-field value as a link that opens the Custom YARA Signatures view page
 * in a new tab when the user can read CYS, the feature is enabled, and the signature is visible in the active space.
 * When the signature cannot be found in the active space, shows an info tooltip instead of the link.
 * Falls back to plain text otherwise.
 */
export const CustomYaraSignatureHighlightedFieldLink: FC<
  CustomYaraSignatureHighlightedFieldLinkProps
> = ({ hit, children }) => {
  const isCustomYaraSignaturesEnabled = useIsExperimentalFeatureEnabled(
    'customYaraSignaturesEnabled'
  );
  const { canReadCustomYaraSignatures } = useUserPrivileges().endpointPrivileges;
  const entryId = getEntryIdFromHit(hit);
  const shouldFetchArtifact =
    isCustomYaraSignaturesEnabled && canReadCustomYaraSignatures && Boolean(entryId);

  if (!shouldFetchArtifact || !entryId) {
    return <>{children}</>;
  }

  return (
    <CustomYaraSignatureHighlightedFieldLinkContent entryId={entryId}>
      {children}
    </CustomYaraSignatureHighlightedFieldLinkContent>
  );
};

interface CustomYaraSignatureHighlightedFieldLinkContentProps {
  entryId: string;
  children: ReactNode;
}

/**
 * Fetches the CYS artifact and renders a link (or not-found tooltip).
 * Mounted only when FF, read privilege, and entry_id are present so that
 * `CustomYaraSignaturesApiClient.getInstance` does not ensure-create the list
 * without those checks.
 */
const CustomYaraSignatureHighlightedFieldLinkContent: FC<
  CustomYaraSignatureHighlightedFieldLinkContentProps
> = ({ entryId, children }) => {
  const { getAppUrl } = useAppUrl();
  const { euiTheme } = useEuiTheme();
  const http = useHttp();
  const apiClient = useMemo(() => CustomYaraSignaturesApiClient.getInstance(http), [http]);

  // `find` is used instead of `get` because only `find` scopes results to artifacts visible in the active space
  const { isSuccess, data } = useQuery<FoundExceptionListItemSchema, IHttpFetchError>(
    ['findCustomYaraSignatureByEntryId', apiClient, entryId],
    () => apiClient.find({ perPage: 1, filter: buildEntryIdFilter(entryId) }),
    {
      retry: false,
      // History keeps earlier alert flyouts mounted, so window focus would refetch every one of them.
      refetchOnWindowFocus: false,
    }
  );
  const itemId = data?.data[0]?.item_id;

  const toRouteUrl = useMemo(() => {
    if (!itemId) {
      return '';
    }

    return getAppUrl({ path: getCustomYaraSignaturesListPath({ show: 'view', itemId }) });
  }, [getAppUrl, itemId]);

  if (isSuccess && !itemId) {
    return (
      <span
        // The highlighted-field cell sets margin-bottom on every div, which pushes this icon
        // below the value. A span stays out of that rule.
        css={css`
          display: inline-flex;
          align-items: center;
          gap: ${euiTheme.size.s};
        `}
        data-test-subj={HIGHLIGHTED_FIELDS_CUSTOM_YARA_SIGNATURE_NOT_FOUND_TEST_ID}
      >
        {children}
        <EuiIconTip
          type="info"
          content={SIGNATURE_NOT_FOUND_TOOLTIP}
          aria-label={SIGNATURE_NOT_FOUND_TOOLTIP}
          position="top"
        />
      </span>
    );
  }

  if (!isSuccess || !itemId) {
    return <>{children}</>;
  }

  return (
    <EuiLink
      href={toRouteUrl}
      target="_blank"
      data-test-subj={HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID}
    >
      {children}
    </EuiLink>
  );
};
