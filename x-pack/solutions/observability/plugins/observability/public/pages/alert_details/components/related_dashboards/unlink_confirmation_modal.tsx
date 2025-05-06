/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUnlinkDashboard } from '../../../../hooks/use_unlink_dashboard';

interface UnlinkDashboardConfirmationPropsModal {
  rule: any;
  ruleId: string | undefined;
  dashboardId: string | undefined;
  title: string;
  onCancel: () => void;
  onDeleted: () => void;
  onDeleting: () => void;
}

export function UnlinkDashboardConfirmationModal({
  rule,
  ruleId,
  dashboardId,
  title,
  onCancel,
  onDeleted,
  onDeleting,
}: UnlinkDashboardConfirmationPropsModal) {
  const [isVisible, setIsVisible] = useState(Boolean(dashboardId));

  const { mutateAsync: unlinkDashboard } = useUnlinkDashboard(rule);

  const handleConfirm = async () => {
    if (dashboardId) {
      setIsVisible(false);

      onDeleting();
      if (ruleId && dashboardId) {
        await unlinkDashboard({ ruleId, dashboardId });
      }

      onDeleted();
    }
  };

  return isVisible ? (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="deleteIdsConfirmation"
      title={i18n.translate('xpack.observability.rules.deleteConfirmationModal.descriptionText', {
        defaultMessage: '{title} will be unlinked.',
        values: { title },
      })}
      cancelButtonText={i18n.translate(
        'xpack.observability.rules.deleteConfirmationModal.cancelButtonLabel',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.observability.rules.deleteConfirmationModal.deleteButtonLabel',
        {
          defaultMessage: 'Unlink',
          values: { title },
        }
      )}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      {i18n.translate('xpack.observability.rules.deleteConfirmationModal.descriptionText', {
        defaultMessage:
          'The dashboard will be removed from linked dashboards. It will not be completely deleted. Do you want to proceed?',
        values: { title },
      })}
    </EuiConfirmModal>
  ) : null;
}
