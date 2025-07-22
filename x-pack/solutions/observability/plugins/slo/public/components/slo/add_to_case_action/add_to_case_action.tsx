/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect } from 'react';
import { sloPaths } from '../../../../common';
import { useKibana } from '../../../hooks/use_kibana';
import { HISTORY_TAB_ID } from '../../../pages/slo_details/components/slo_details';

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
    <CasesContext owner={['observability']} permissions={permissions}>
      <Content slo={slo} onCancel={onCancel} onConfirm={onConfirm} />
    </CasesContext>
  ) : null;
}

function Content({ slo, onCancel, onConfirm }: Props) {
  const {
    services: { cases },
  } = useKibana();

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
                pathAndQuery: sloPaths.sloDetails(
                  slo.id,
                  'instanceId' in slo ? slo.instanceId : ALL_VALUE,
                  undefined,
                  HISTORY_TAB_ID
                ),
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
  }, [casesModal, slo]);

  return null;
}
