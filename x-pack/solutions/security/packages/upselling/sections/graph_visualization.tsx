/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiLink, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const GraphVisualizationUpsellingSection = memo(
  ({ upgradeHref }: { upgradeHref?: string }) => {
    return (
      <div data-test-subj="graph-visualization-upselling">
        <EuiPanel hasShadow={false}>
          <FormattedMessage
            id="securitySolutionPackages.upselling.graphVisualization.description"
            defaultMessage="This feature requires a {subscription}."
            values={{
              subscription: (
                <EuiLink href={upgradeHref} target="_blank">
                  <FormattedMessage
                    id="securitySolutionPackages.upselling.graphVisualization.subscriptionLink"
                    defaultMessage="Platinum subscription"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiPanel>
      </div>
    );
  }
);

GraphVisualizationUpsellingSection.displayName = 'GraphVisualizationUpsellingSection';
