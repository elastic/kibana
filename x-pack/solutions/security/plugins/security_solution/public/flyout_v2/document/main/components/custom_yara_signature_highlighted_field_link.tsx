/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useNavigateByRouterEventHandler } from '../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { useAppUrl } from '../../../../common/lib/kibana';
import { getCustomYaraSignaturesListPath } from '../../../../management/common/routing';
import {
  CUSTOM_YARA_SIGNATURE_ENTRY_ID_FIELD_NAME,
  CUSTOM_YARA_SIGNATURE_ENTRY_NAME_FIELD_NAME,
  CUSTOM_YARA_SIGNATURE_RULE_IDENTIFIER_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID } from './test_ids';

const CUSTOM_YARA_SIGNATURE_HIGHLIGHTED_FIELDS = new Set([
  CUSTOM_YARA_SIGNATURE_ENTRY_NAME_FIELD_NAME,
  CUSTOM_YARA_SIGNATURE_RULE_IDENTIFIER_FIELD_NAME,
]);

export const isCustomYaraSignatureHighlightedField = (field: string): boolean =>
  CUSTOM_YARA_SIGNATURE_HIGHLIGHTED_FIELDS.has(field);

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
 * Renders a highlighted-field value as a link to the Custom YARA Signatures edit page
 * when the user can read CYS and the feature is enabled. Falls back to plain text otherwise.
 */
export const CustomYaraSignatureHighlightedFieldLink: FC<
  CustomYaraSignatureHighlightedFieldLinkProps
> = ({ hit, children }) => {
  const isCustomYaraSignaturesEnabled = useIsExperimentalFeatureEnabled(
    'customYaraSignaturesEnabled'
  );
  const { canReadCustomYaraSignatures } = useUserPrivileges().endpointPrivileges;
  const { getAppUrl } = useAppUrl();
  const entryId = getEntryIdFromHit(hit);

  const { toRoutePath, toRouteUrl } = useMemo(() => {
    if (!entryId) {
      return { toRoutePath: '', toRouteUrl: '' };
    }

    const path = getCustomYaraSignaturesListPath({ show: 'edit', itemId: entryId });
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [entryId, getAppUrl]);

  const onClick = useNavigateByRouterEventHandler(toRoutePath);

  if (!isCustomYaraSignaturesEnabled || !canReadCustomYaraSignatures || !entryId) {
    return <>{children}</>;
  }

  return (
    <EuiLink
      href={toRouteUrl}
      onClick={onClick}
      data-test-subj={HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID}
    >
      {children}
    </EuiLink>
  );
};
