/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { MergedServiceDashboard } from '..';
import { SaveDashboardModal } from './save_dashboard_modal';

export function LinkDashboard({
  onRefresh,
  emptyButton = false,
  serviceDashboards,
  serviceName,
}: {
  onRefresh: () => void;
  emptyButton?: boolean;
  serviceDashboards?: MergedServiceDashboard[];
  serviceName: string;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      {emptyButton ? (
        <EuiButtonEmpty
          color="text"
          size="s"
          iconType="plusInCircle"
          data-test-subj="apmLinkServiceDashboardMenu"
          onClick={() => setIsModalVisible(true)}
        >
          {i18n.translate('xpack.apm.serviceDashboards.linkEmptyButtonLabel', {
            defaultMessage: 'Link new dashboard',
          })}
        </EuiButtonEmpty>
      ) : (
        <EuiButton data-test-subj="apmAddServiceDashboard" onClick={() => setIsModalVisible(true)}>
          {i18n.translate('xpack.apm.serviceDashboards.linkButtonLabel', {
            defaultMessage: 'Link dashboard',
          })}
        </EuiButton>
      )}

      {isModalVisible && (
        <SaveDashboardModal
          onClose={() => setIsModalVisible(false)}
          onRefresh={onRefresh}
          serviceDashboards={serviceDashboards}
          serviceName={serviceName}
        />
      )}
    </>
  );
}
