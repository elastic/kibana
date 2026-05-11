/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FieldTypesProvider } from '../../threat_intelligence/containers/field_types_provider';
import type { Indicator } from '../../../common/threat_intelligence/types/indicator';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { Header } from './header';
import { Content } from './content';
import { Footer } from './footer';
import { useTabs } from './hooks/use_tabs';
import { getTabsDisplayed } from './tabs';

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
   * The indicator document, as a Discover data table record
   */
  hit: DataTableRecord;
  /**
   * Renderer for cell actions
   */
  renderCellActions: CellActionRenderer;
}

/**
 * IOC details system flyout content.
 */
export const IOCDetails: FC<IOCDetailsProps> = memo(({ hit, renderCellActions }) => {
  const indicator = useMemo<Indicator>(
    () => ({ _id: hit.raw._id, fields: hit.flattened as Indicator['fields'] }),
    [hit]
  );

  const { selectedTabId, setSelectedTabId } = useTabs({});

  const onViewAllFieldsInTable = useCallback(() => {
    setSelectedTabId('table');
  }, [setSelectedTabId]);

  const tabs = useMemo(
    () => getTabsDisplayed({ indicator, onViewAllFieldsInTable, renderCellActions }),
    [indicator, onViewAllFieldsInTable, renderCellActions]
  );

  return (
    <FieldTypesProvider>
      <EuiFlyoutHeader>
        <Header
          indicator={indicator}
          tabs={tabs}
          selectedTabId={selectedTabId}
          setSelectedTabId={setSelectedTabId}
          renderCellActions={renderCellActions}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={iocFlyoutBodyCss}>
        <Content tabs={tabs} selectedTabId={selectedTabId} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <Footer indicator={indicator} />
      </EuiFlyoutFooter>
    </FieldTypesProvider>
  );
});

IOCDetails.displayName = 'IOCDetails';
