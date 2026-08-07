/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { buildMitreReferenceUrl } from '../../../../../../common/detection_engine/mitre/build_mitre_reference_url';
import * as i18n from '../translations';

export interface InvalidMitreBadgeProps {
  id: string;
}

/**
 * A warning-colored badge for a MITRE ATT&CK® ID that is no longer present in the
 * currently bundled dataset. Links out to the MITRE reference page when the ID
 * maps to a resolvable URL.
 */
export const InvalidMitreBadge = memo(({ id }: InvalidMitreBadgeProps) => {
  const href = buildMitreReferenceUrl(id);

  if (!href) {
    return (
      <EuiBadge color="warning" data-test-subj={`coverageOverviewInvalidMitreBadge-${id}`}>
        {id}
      </EuiBadge>
    );
  }

  return (
    <EuiToolTip content={i18n.INVALID_MITRE_ID_BADGE_TOOLTIP(id)}>
      <EuiBadge
        color="warning"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        iconType="popout"
        iconSide="right"
        data-test-subj={`coverageOverviewInvalidMitreBadge-${id}`}
      >
        {id}
      </EuiBadge>
    </EuiToolTip>
  );
});
InvalidMitreBadge.displayName = 'InvalidMitreBadge';
