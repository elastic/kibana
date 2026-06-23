/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { noop } from 'lodash/fp';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import type { EntityType } from '../../../../common/search_strategy';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../../../flyout_v2/shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../../../flyout_v2/shared/constants/flyout_history';
import { DocumentFlyoutWrapper } from '../../../flyout_v2/document/main/document_flyout_wrapper';
import { cellActionRenderer } from '../../../flyout_v2/shared/components/cell_actions';
import type { RiskInputsTabProps } from '../entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { RiskInputsTab as RiskInputsTabBase } from '../entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';

export type FlyoutV2RiskInputsTabProps<T extends EntityType> = Omit<
  RiskInputsTabProps<T>,
  'openAlertPreview'
>;

/**
 * Flyout v2 wrapper around the context-agnostic {@link RiskInputsTabBase}. It owns
 * the v2 navigation — opening alert previews through the new EUI flyout system
 * (`overlays.openSystemFlyout` + `flyoutProviders` + `DocumentFlyoutWrapper`) — and
 * composes the v1 tab, which renders everything else.
 */
export const RiskInputsTab = <T extends EntityType>(props: FlyoutV2RiskInputsTabProps<T>) => {
  const { services } = useKibana();
  const store = useStore();
  const history = useHistory();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

  const openAlertPreview = useCallback(
    (id: string, indexName: string) => {
      services.overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <DocumentFlyoutWrapper
              documentId={id}
              indexName={indexName}
              renderCellActions={cellActionRenderer}
              onAlertUpdated={noop}
            />
          ),
        }),
        {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: 'inherit',
        }
      );
    },
    [services, store, history, defaultDocumentFlyoutProperties, historyKey]
  );

  return <RiskInputsTabBase {...props} openAlertPreview={openAlertPreview} />;
};

RiskInputsTab.displayName = 'RiskInputsTab';
