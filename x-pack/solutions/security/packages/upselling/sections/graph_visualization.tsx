/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '@kbn/security-solution-navigation';

const GRAPH_VISUALIZATION_UPSELL_TITLE = i18n.translate(
  'securitySolutionPackages.upselling.graphVisualization.title',
  {
    defaultMessage: 'Graph visualization requires a Platinum license',
  }
);

const GRAPH_VISUALIZATION_UPSELL_BUTTON = i18n.translate(
  'securitySolutionPackages.upselling.graphVisualization.upgradeButton',
  {
    defaultMessage: 'Upgrade',
  }
);

export const GraphVisualizationUpsellingSection = memo(
  ({ upgradeHref }: { upgradeHref?: string }) => {
    const { navigateTo } = useNavigation();
    const goToSubscription = useCallback(() => {
      navigateTo({ url: upgradeHref });
    }, [navigateTo, upgradeHref]);

    return (
      <EuiEmptyPrompt
        color="subdued"
        icon={<EuiIcon type="lock" size="xl" aria-hidden={true} />}
        title={<h3>{GRAPH_VISUALIZATION_UPSELL_TITLE}</h3>}
        actions={
          upgradeHref
            ? [
                // eslint-disable-next-line @elastic/eui/href-or-on-click
                <EuiButton href={upgradeHref} onClick={goToSubscription} fill>
                  {GRAPH_VISUALIZATION_UPSELL_BUTTON}
                </EuiButton>,
              ]
            : undefined
        }
      />
    );
  }
);

GraphVisualizationUpsellingSection.displayName = 'GraphVisualizationUpsellingSection';
