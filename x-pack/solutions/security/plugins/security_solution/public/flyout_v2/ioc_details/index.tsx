/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FieldTypesProvider } from '../../threat_intelligence/containers/field_types_provider';
import { useIndicatorById } from '../../cases/attachments/indicator/hooks/use_indicator_by_id';
import { IOCDetailsContext } from './context';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { useTabs } from './hooks/use_tabs';
import { getTabsDisplayed } from './tabs';
import { IOC_DETAILS_LOADING_TEST_ID, IOC_DETAILS_ERROR_TEST_ID } from './test_ids';

/**
 * Styles applied to the EuiFlyoutBody so the JSON tab's Monaco editor
 * fills the available height without producing a scrollbar.
 */
export const iocFlyoutBodyCss = css({
  '.euiFlyoutBody__overflowContent': { blockSize: '100%' },
  '.iocJsonContent > *': {
    height: '100%',
    '& > *:first-child': { flexGrow: 0 },
    '& > *:last-child': { minHeight: 0 },
  },
  '.react-monaco-editor-container': { height: '100% !important' },
});

export interface IOCDetailsProps {
  /**
   * Id of the indicator document
   */
  id: string;
}

/**
 * IOC details system flyout content.
 */
export const IOCDetails: FC<IOCDetailsProps> = memo(({ id }) => {
  const { indicator, isLoading } = useIndicatorById(id);

  const { selectedTabId, setSelectedTabId } = useTabs({});

  const onViewAllFieldsInTable = useCallback(() => {
    setSelectedTabId('table');
  }, [setSelectedTabId]);

  const tabs = useMemo(() => getTabsDisplayed(onViewAllFieldsInTable), [onViewAllFieldsInTable]);

  if (isLoading) {
    return (
      <EuiFlyoutBody>
        <EuiEmptyPrompt
          icon={<EuiLoadingSpinner size="xl" />}
          data-test-subj={IOC_DETAILS_LOADING_TEST_ID}
        />
      </EuiFlyoutBody>
    );
  }

  if (!indicator) {
    return (
      <EuiFlyoutBody>
        <EuiEmptyPrompt
          iconType="warning"
          title={
            <h2>
              {i18n.translate('xpack.securitySolution.flyout.iocDetails.errorTitle', {
                defaultMessage: 'Unable to display indicator details',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.securitySolution.flyout.iocDetails.errorBody', {
                defaultMessage:
                  'There was an error displaying the indicator details. Please try again later.',
              })}
            </p>
          }
          data-test-subj={IOC_DETAILS_ERROR_TEST_ID}
        />
      </EuiFlyoutBody>
    );
  }

  return (
    <FieldTypesProvider>
      <IOCDetailsContext.Provider value={{ id, indicator }}>
        <EuiFlyoutHeader>
          <Header tabs={tabs} selectedTabId={selectedTabId} setSelectedTabId={setSelectedTabId} />
        </EuiFlyoutHeader>
        <EuiFlyoutBody css={iocFlyoutBodyCss}>
          <Content tabs={tabs} selectedTabId={selectedTabId} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <Footer />
        </EuiFlyoutFooter>
      </IOCDetailsContext.Provider>
    </FieldTypesProvider>
  );
});

IOCDetails.displayName = 'IOCDetails';
