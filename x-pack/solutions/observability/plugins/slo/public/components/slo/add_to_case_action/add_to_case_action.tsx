/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { i18n } from '@kbn/i18n';
import { sloDetailsHistoryLocatorID } from '@kbn/observability-plugin/common';
import { encode } from '@kbn/rison';
import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import React, { useEffect } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useUrlAppState } from '../../../pages/slo_details/components/history/hooks/use_url_app_state';

export interface Props {
  slo: SLOWithSummaryResponse | SLODefinitionResponse;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AddToCaseAction({ slo, onCancel, onConfirm }: Props) {
  const {
    services: { cases },
  } = useKibana();

  const getCasesContext = cases?.ui?.getCasesContext;
  const canUseCases = cases?.helpers?.canUseCases;

  const CasesContext = getCasesContext?.();
  const permissions = canUseCases?.();
  const hasCasesPermissions = Boolean(
    permissions?.read && permissions?.push && permissions?.update
  );

  return hasCasesPermissions && !!permissions && CasesContext ? (
    <CasesContext
      owner={['observability']}
      permissions={permissions}
      features={{ alerts: { sync: false } }}
    >
      <Content slo={slo} onCancel={onCancel} onConfirm={onConfirm} />
    </CasesContext>
  ) : null;
}

function Content({ slo, onCancel, onConfirm }: Props) {
  const {
    services: {
      cases,
      share: {
        url: { locators },
      },
    },
  } = useKibana();
  const { state } = useUrlAppState(slo);
  const locator = locators.get(sloDetailsHistoryLocatorID);

  const useCasesAddToExistingCaseModal = cases?.hooks?.useCasesAddToExistingCaseModal!;
  const casesModal = useCasesAddToExistingCaseModal({
    onClose: (theCase, isCreateCase) => {
      if (theCase) {
        onConfirm();
      } else if (!isCreateCase) {
        onCancel();
      }
    },
  });

  useEffect(() => {
    casesModal.open({
      getAttachments: () => {
        return [
          {
            persistableStateAttachmentState: {
              type: 'slo_history',
              url: {
                pathAndQuery: locator?.getRedirectUrl({
                  id: slo.id,
                  instanceId: 'instanceId' in slo ? slo.instanceId : ALL_VALUE,
                  encodedAppState: encode(state),
                }),
                label: slo.name,
                actionLabel: i18n.translate('xpack.slo.addToCase.caseAttachmentLabel', {
                  defaultMessage: 'Go to SLO history',
                }),
                iconType: 'metricbeatApp',
              },
            },
            persistableStateAttachmentTypeId: '.page',
            type: 'persistableState',
          },
        ] as CaseAttachmentsWithoutOwner;
      },
    });

    return () => casesModal.close();
  }, [casesModal, slo, state, locator]);

  return null;
}
