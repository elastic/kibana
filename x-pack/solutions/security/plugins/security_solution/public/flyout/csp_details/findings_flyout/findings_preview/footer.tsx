/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { FlyoutFooter } from '../../../shared/components/flyout_footer';

export interface FindingsMisconfigurationPreviewFooter {
  finding: CspFinding;
  scopeId?: string;
}

export const FindingMisconfigurationPreviewFooter = ({
  finding,
  scopeId,
}: FindingsMisconfigurationPreviewFooter) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const openFindingMisconfigurationFlyout = useCallback(() => {
    openFlyout({
      right: {
        id: 'findings-misconfiguration-panel',
        params: {
          resourceId: finding.resource.id,
          ruleId: finding.rule.id,
          scopeId,
        },
      },
    });
  }, [finding.resource.id, finding.rule.id, openFlyout, scopeId]);

  return (
    <FlyoutFooter data-test-subj={'finding-misconfiguration-preview-footer'}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink
            onClick={openFindingMisconfigurationFlyout}
            target="_blank"
            data-test-subj={'open-finding-misconfiguration-flyout'}
          >
            {i18n.translate(
              'xpack.securitySolution.flyout.misconfigurationFindings.preview.viewDetailsLabel',
              {
                defaultMessage: 'Show full finding details',
              }
            )}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  );
};
