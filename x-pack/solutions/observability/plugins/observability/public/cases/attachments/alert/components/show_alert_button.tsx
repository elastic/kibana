/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { AlertsFlyout } from '../../../../components/alerts_flyout/alerts_flyout';
import { useFetchAlertDetail } from '../../../../hooks/use_fetch_alert_detail';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { SHOW_ALERT_TOOLTIP } from '../translations';

interface ShowAlertButtonProps {
  id: string;
  alertId: string;
}

export function ShowAlertButton({ id, alertId }: ShowAlertButtonProps) {
  const { observabilityRuleTypeRegistry } = usePluginContext();

  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const [alertLoading, alertDetail] = useFetchAlertDetail(selectedAlertId);

  const onClick = useCallback(() => {
    setSelectedAlertId(alertId);
  }, [alertId]);

  const handleFlyoutClose = useCallback(() => setSelectedAlertId(''), []);

  return (
    <>
      <EuiToolTip position="top" content={<p>{SHOW_ALERT_TOOLTIP}</p>}>
        <EuiButtonIcon
          aria-label={SHOW_ALERT_TOOLTIP}
          data-test-subj={`comment-action-show-alert-${id}`}
          onClick={onClick}
          iconType="chevronSingleRight"
          id={`${id}-show-alert`}
        />
      </EuiToolTip>
      {alertDetail && selectedAlertId !== '' && !alertLoading ? (
        <AlertsFlyout
          alert={alertDetail.raw}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
          onClose={handleFlyoutClose}
        />
      ) : null}
    </>
  );
}
