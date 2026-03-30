/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { ASSET_DETAILS_FLYOUT_COMPONENT_NAME } from '../constants';
import { Content } from '../content/content';
import { FlyoutHeader } from '../header/flyout_header';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';
import { useAssetDetailsUrlState } from '../hooks/use_asset_details_url_state';
import { usePageHeader } from '../hooks/use_page_header';
import { useTabSwitcherContext } from '../hooks/use_tab_switcher';
import type { ContentTemplateProps } from '../types';

export const Flyout = ({
  tabs = [],
  links = [],
  closeFlyout,
}: ContentTemplateProps & { closeFlyout: () => void }) => {
  const [, setUrlState] = useAssetDetailsUrlState();
  const { entity, loading, schema } = useAssetDetailsRenderPropsContext();
  const { rightSideItems, tabEntries } = usePageHeader(tabs, links);
  const { activeTabId } = useTabSwitcherContext();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  useEffect(() => {
    if (!loading) {
      telemetry.reportAssetDetailsFlyoutViewed({
        componentName: ASSET_DETAILS_FLYOUT_COMPONENT_NAME,
        assetType: entity.type,
        tabId: activeTabId,
        schema_selected: schema || 'ecs',
      });
    }
  }, [schema, entity.type, activeTabId, telemetry, loading]);

  const handleOnClose = useCallback(() => {
    setUrlState(null);
    closeFlyout();
  }, [closeFlyout, setUrlState]);

  const headingId = useGeneratedHtmlId({ prefix: 'assetDetailsFlyoutTitle' });

  return (
    <EuiFlyout
      onClose={handleOnClose}
      data-component-name={ASSET_DETAILS_FLYOUT_COMPONENT_NAME}
      data-asset-type={entity.type}
      data-schema-selected={schema}
      aria-labelledby={headingId}
    >
      <>
        <EuiFlyoutHeader hasBorder>
          <FlyoutHeader
            title={entity.name}
            tabs={tabEntries}
            rightSideItems={rightSideItems}
            entityType={entity.type}
            loading={loading}
            schema={schema}
            headingId={headingId}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <Content />
        </EuiFlyoutBody>
      </>
    </EuiFlyout>
  );
};
