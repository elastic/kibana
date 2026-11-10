/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { DIGITAL_EXPERIENCE_EBT_ELEMENTS } from '../ebt_constants';
import { EDOT_BROWSER_DOCS_URL } from '../utils/doc_links';

const NO_DATA_LABEL = i18n.translate('xpack.digitalExperience.dataPanel.noData', {
  defaultMessage: 'No data in this time range.',
});

const INSTRUMENTATION_DOCS_LABEL = i18n.translate(
  'xpack.digitalExperience.dataPanel.instrumentationDocs',
  { defaultMessage: 'Learn what EDOT Browser records' }
);

/** A titled panel of an application's page that shows a skeleton while loading and an empty state. */
export function DataPanel({
  title,
  subtitle,
  actions,
  isLoading,
  isEmpty,
  emptyMessage = NO_DATA_LABEL,
  showInstrumentationDocs = false,
  'data-test-subj': dataTestSubj,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage?: string;
  /** Links the empty state to the EDOT Browser docs, for data that depends on instrumentation. */
  showInstrumentationDocs?: boolean;
  'data-test-subj': string;
  children: ReactNode;
}) {
  const renderEmpty = () => {
    return (
      <EuiText size="s" color="subdued" data-test-subj={`${dataTestSubj}Empty`}>
        <p>
          {emptyMessage}{' '}
          {showInstrumentationDocs && (
            <EuiLink
              href={EDOT_BROWSER_DOCS_URL}
              target="_blank"
              external
              data-test-subj={`${dataTestSubj}DocsLink`}
              {...getEbtProps({
                action: EBT_CLICK_ACTIONS.ADD_DATA,
                element: DIGITAL_EXPERIENCE_EBT_ELEMENTS.INSTRUMENTATION_DOCS_LINK,
              })}
            >
              {INSTRUMENTATION_DOCS_LABEL}
            </EuiLink>
          )}
        </p>
      </EuiText>
    );
  };

  return (
    <EuiPanel hasBorder data-test-subj={dataTestSubj}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>{title}</h2>
          </EuiTitle>
          {subtitle && (
            <EuiText size="xs" color="subdued">
              {subtitle}
            </EuiText>
          )}
        </EuiFlexItem>
        {actions && <EuiFlexItem grow={false}>{actions}</EuiFlexItem>}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiSkeletonText
        lines={4}
        isLoading={isLoading}
        contentAriaLabel={title}
        data-test-subj={`${dataTestSubj}Loading`}
      >
        {isEmpty ? renderEmpty() : children}
      </EuiSkeletonText>
    </EuiPanel>
  );
}
