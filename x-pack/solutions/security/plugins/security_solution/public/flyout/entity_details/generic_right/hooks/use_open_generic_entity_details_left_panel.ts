/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { EntityDetailsPath } from '../../shared/components/left_panel/left_panel_header';
import type { CloudPostureEntityIdentifier } from '../../../../cloud_security_posture/components/entity_insight';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useNonClosedAlerts } from '../../../../cloud_security_posture/hooks/use_non_closed_alerts';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { GenericEntityDetailsPanelKey } from '../../generic_details_left';

export const useOpenGenericEntityDetailsLeftPanel = ({
  field,
  value,
  entityDocId,
  scopeId,
}: {
  field: CloudPostureEntityIdentifier;
  value: string;
  entityDocId: string;
  scopeId: string;
}) => {
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { hasMisconfigurationFindings } = useHasMisconfigurations(field, value);
  const { hasVulnerabilitiesFindings } = useHasVulnerabilities(field, value);
  const { to, from } = useGlobalTime();
  const { hasNonClosedAlerts } = useNonClosedAlerts({
    field,
    value,
    to,
    from,
    queryId: `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-generic-entity-alerts`,
    runtimeMappings: {
      'related.entity': {
        type: 'keyword',
      },
    },
  });

  const openGenericEntityDetails = (path: EntityDetailsPath) => {
    return openLeftPanel({
      id: GenericEntityDetailsPanelKey,
      params: {
        entityDocId,
        field,
        value,
        scopeId,
        isRiskScoreExist: false,
        hasMisconfigurationFindings,
        hasVulnerabilitiesFindings,
        hasNonClosedAlerts,
        path,
      },
    });
  };

  return {
    openGenericEntityDetails,
  };
};
