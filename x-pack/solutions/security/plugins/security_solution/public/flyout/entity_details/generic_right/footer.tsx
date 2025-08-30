/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlyoutFooter, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { DocumentEventTypes } from '../../../common/lib/telemetry';
import { TakeAction } from '../shared/components/take_action';
import {
  GENERIC_ENTITY_FLYOUT_FOOTER_DETAILS_LINK_TEST_SUBJ,
  GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ,
} from './constants';
import { GenericEntityPanelKey } from '../shared/constants';
import { GENERIC_ENTITY_PREVIEW_BANNER } from '../../document_details/preview/constants';
import { useKibana } from '../../../common/lib/kibana';

export const GenericEntityFlyoutFooter = ({
  entityId,
  isPreviewMode,
  scopeId,
}: {
  entityId: EntityEcs['id'];
  isPreviewMode: boolean;
  scopeId: string;
}) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;

  const openDocumentFlyout = useCallback(() => {
    openFlyout({
      right: {
        id: GenericEntityPanelKey,
        params: {
          scopeId,
          entityId,
          banner: GENERIC_ENTITY_PREVIEW_BANNER,
        },
      },
    });
    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
      location: scopeId,
      panel: 'right',
    });
  }, [openFlyout, scopeId, entityId, telemetry]);

  const fullDetailsLink = useMemo(
    () => (
      <EuiLink
        onClick={openDocumentFlyout}
        target="_blank"
        data-test-subj={GENERIC_ENTITY_FLYOUT_FOOTER_DETAILS_LINK_TEST_SUBJ}
      >
        <>
          {i18n.translate('xpack.securitySolution.flyout.preview.genericEntityFullDetails', {
            defaultMessage: 'Show full entity details',
          })}
        </>
      </EuiLink>
    ),
    [openDocumentFlyout]
  );

  return (
    <EuiFlyoutFooter data-test-subj={GENERIC_ENTITY_FLYOUT_FOOTER_TEST_SUBJ}>
      <EuiPanel color="transparent">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {isPreviewMode && <EuiFlexItem grow={false}>{fullDetailsLink}</EuiFlexItem>}

          <EuiFlexItem grow={false}>
            <TakeAction
              isDisabled={!entityId}
              kqlQuery={`entity.id: "${entityId}" OR related.entity: "${entityId}"`}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlyoutFooter>
  );
};
