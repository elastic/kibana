/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DetailPanelProcessTab } from '@kbn/session-view-plugin/public';
import type { Process } from '@kbn/session-view-plugin/common';
import { useSessionViewPanelContext } from '../context';

/**
 * Tab displayed in the SessionView preview panel, shows the details related to the process selected in the SessionView tree.
 */
export const ProcessTab = memo(() => {
  const { selectedProcess, index } = useSessionViewPanelContext();

  // We need to partially recreate the Process object here, as the SessionView code
  // is expecting a Process object with at least the following properties
  const process: Process | null = useMemo(
    () =>
      selectedProcess
        ? ({
            getDetails: () => selectedProcess.details,
            id: selectedProcess.id,
            getEndTime: () => selectedProcess.endTime,
          } as Process)
        : null,
    [selectedProcess]
  );

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      aria-label={i18n.translate(
        'xpack.securitySolution.flyout.preview.sessionview.processContentAriaLabel',
        { defaultMessage: 'Process' }
      )}
    >
      <DetailPanelProcessTab selectedProcess={process} index={index} />
    </EuiPanel>
  );
});

ProcessTab.displayName = 'ProcessTab';
