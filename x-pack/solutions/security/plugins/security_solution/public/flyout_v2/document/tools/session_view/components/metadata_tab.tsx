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
import type { Process } from '@kbn/session-view-plugin/common';
import { isCustomProcess, isProcess } from '../utils/helpers';
import type { CustomProcess } from '../../../../../flyout/document_details/session_view/context';

export interface MetadataTabProps {
  /**
   * Selected process information coming from Session View, to show information in the metadata tab
   */
  // TODO remove CustomProcess when the expandable flyout is removed
  selectedProcess: CustomProcess | Process | null;
}

/**
 * Tab displayed in the SessionView preview panel, shows metadata related process selected in the SessionView tree.
 */
export const MetadataTab = memo(({ selectedProcess }: MetadataTabProps) => {
  // TODO delete check logic when the expandable flyout is removed
  const processHost = isProcess(selectedProcess)
    ? selectedProcess.getDetails().host
    : isCustomProcess(selectedProcess)
    ? selectedProcess.details.host
    : undefined;
  const processContainer = isProcess(selectedProcess)
    ? selectedProcess.getDetails().container
    : isCustomProcess(selectedProcess)
    ? selectedProcess.details.container
    : undefined;
  const processOrchestrator = isProcess(selectedProcess)
    ? selectedProcess.getDetails().orchestrator
    : isCustomProcess(selectedProcess)
    ? selectedProcess.details.orchestrator
    : undefined;
  const processCloud = isProcess(selectedProcess)
    ? selectedProcess.getDetails().cloud
    : isCustomProcess(selectedProcess)
    ? selectedProcess.details.cloud
    : undefined;

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
        processHost={processHost}
        processContainer={processContainer}
        processOrchestrator={processOrchestrator}
        processCloud={processCloud}
      />
    </EuiPanel>
  );
});

MetadataTab.displayName = 'MetadataTab';
