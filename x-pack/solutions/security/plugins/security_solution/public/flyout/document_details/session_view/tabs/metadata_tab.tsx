/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DetailPanelMetadataTab } from '@kbn/session-view-plugin/public';
import { useSessionViewPanelContext } from '../context';

/**
 * Tab displayed in the SessionView preview panel, shows metadata related process selected in the SessionView tree.
 */
export const MetadataTab = memo(() => {
  const { selectedProcess } = useSessionViewPanelContext();

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      aria-label={i18n.translate(
        'xpack.securitySolution.flyout.preview.sessionview.metadataContentAriaLabel',
        { defaultMessage: 'Process' }
      )}
    >
      <DetailPanelMetadataTab
        processHost={selectedProcess?.details.host}
        processContainer={selectedProcess?.details.container}
        processOrchestrator={selectedProcess?.details.orchestrator}
        processCloud={selectedProcess?.details.cloud}
      />
    </EuiPanel>
  );
});

MetadataTab.displayName = 'MetadataTab';
