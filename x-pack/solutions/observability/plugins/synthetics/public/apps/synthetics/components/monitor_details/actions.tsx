/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiPopover, EuiContextMenuPanel } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { RunTestManuallyContextItem } from './run_test_manually';
import { EditMonitorContextItem } from './monitor_summary/edit_monitor_link';
import { RefreshContextItem } from '../common/components/refresh_button';
import { AddToCaseContextItem } from './add_to_case_action';
import { ClientPluginsStart } from '../../../../plugin';

export function Actions() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const handleActionsClick = () => setIsPopoverOpen((value) => !value);
  const {
    services: { observabilityShared },
  } = useKibana<ClientPluginsStart>();
  const isAddToCaseEnabled =
    observabilityShared.config?.unsafe?.investigativeExperienceEnabled || false;

  const closePopover = () => setIsPopoverOpen(false);
  return (
    <EuiPopover
      data-test-subj="monitorDetailsHeaderControlPopover"
      button={
        <EuiButton
          data-test-subj="monitorDetailsHeaderControlActionsButton"
          fill
          iconSide="right"
          iconType="arrowDown"
          iconSize="s"
          onClick={handleActionsClick}
        >
          {i18n.translate('xpack.synthetics.monitorDetails.headerControl.actions', {
            defaultMessage: 'Actions',
          })}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiContextMenuPanel
        size="m"
        items={[
          <EditMonitorContextItem />,
          <RefreshContextItem />,
          <RunTestManuallyContextItem />,
        ].concat(isAddToCaseEnabled ? [<AddToCaseContextItem />] : [])}
      />
    </EuiPopover>
  );
}
