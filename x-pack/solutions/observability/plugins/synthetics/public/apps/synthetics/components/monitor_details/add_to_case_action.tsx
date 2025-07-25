/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { type TimeRange, getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { PageAttachmentPersistedState } from '@kbn/page-attachment-schema';
import { type CasesPermissions } from '@kbn/cases-plugin/common';
import { ClientPluginsStart } from '../../../../plugin';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useGetUrlParams, useMonitorDetailLocator } from '../../hooks';

export function AddToCaseContextItem() {
  const {
    services: { cases },
  } = useKibana<ClientPluginsStart>();
  const getCasesContext = cases?.ui?.getCasesContext;
  const canUseCases = cases?.helpers?.canUseCases;

  const casesPermissions: CasesPermissions = useMemo(() => {
    if (!canUseCases) {
      return {
        all: false,
        create: false,
        read: false,
        update: false,
        delete: false,
        push: false,
        connectors: false,
        settings: false,
        reopenCase: false,
        createComment: false,
        assign: false,
      };
    }
    return canUseCases();
  }, [canUseCases]);
  const hasCasesPermissions =
    casesPermissions.read && casesPermissions.update && casesPermissions.push;
  const CasesContext = useMemo(() => {
    if (!getCasesContext) {
      return React.Fragment;
    }
    return getCasesContext();
  }, [getCasesContext]);

  if (!cases) {
    return null;
  }

  return hasCasesPermissions ? (
    <CasesContext permissions={casesPermissions} owner={['observability']}>
      <AddToCaseButtonContent />
    </CasesContext>
  ) : null;
}
function AddToCaseButtonContent() {
  const { monitor } = useSelectedMonitor();
  const { dateRangeEnd, dateRangeStart, locationId } = useGetUrlParams();
  const services = useKibana<ClientPluginsStart>().services;
  const notifications = services.notifications;
  // type checked in wrapper component
  const useCasesAddToExistingCaseModal = services.cases?.hooks?.useCasesAddToExistingCaseModal!;
  const casesModal = useCasesAddToExistingCaseModal();
  const timeRange: TimeRange = {
    from: dateRangeStart,
    to: dateRangeEnd,
  };

  const redirectUrl = useMonitorDetailLocator({
    configId: monitor?.config_id ?? '',
    timeRange: convertToAbsoluteTimeRange(timeRange),
    locationId,
    tabId: 'history',
  });

  const onClick = useCallback(() => {
    if (!redirectUrl || !monitor?.name) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.synthetics.cases.addToCaseModal.error.noMonitorLocator', {
          defaultMessage: 'Error adding monitor to case',
        }),
        'data-test-subj': 'monitorAddToCaseError',
      });
      return;
    }

    casesModal.open({
      getAttachments: () => {
        const persistableStateAttachmentState: PageAttachmentPersistedState = {
          type: 'synthetics_monitor',
          url: {
            pathAndQuery: redirectUrl,
            label: monitor.name,
            actionLabel: i18n.translate(
              'xpack.synthetics.cases.addToCaseModal.goToMonitorHistoryActionLabel',
              {
                defaultMessage: 'Go to Monitor History',
              }
            ),
            iconType: 'uptimeApp',
          },
        };
        return [
          {
            persistableStateAttachmentState,
            persistableStateAttachmentTypeId: '.page',
            type: 'persistableState',
          },
        ] as CaseAttachmentsWithoutOwner;
      },
    });
  }, [casesModal, notifications.toasts, monitor?.name, redirectUrl]);

  return (
    <EuiContextMenuItem
      key="addToCase"
      data-test-subj="syntheticsMonitorAddToCaseButton"
      icon="plusInCircle"
      onClick={onClick}
    >
      {i18n.translate('xpack.synthetics.cases.addToCaseModal.buttonLabel', {
        defaultMessage: 'Add to case',
      })}
    </EuiContextMenuItem>
  );
}

export const convertToAbsoluteTimeRange = (timeRange?: TimeRange): TimeRange | undefined => {
  if (!timeRange) {
    return;
  }

  const absRange = getAbsoluteTimeRange(
    {
      from: timeRange.from,
      to: timeRange.to,
    },
    { forceNow: new Date() }
  );

  return {
    from: absRange.from,
    to: absRange.to,
  };
};
