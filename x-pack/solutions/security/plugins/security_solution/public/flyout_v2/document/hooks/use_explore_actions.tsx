/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useKibana } from '../../../common/lib/kibana';
import { getExploreButtonInfo } from '../utils/get_explore_url';

export interface UseExploreActionsParams {
  /**
   * The raw document record, used to extract alert metadata
   */
  hit: DataTableRecord;
  /**
   * Callback to close the popover when the item is clicked
   */
  closePopover: () => void;
}

export interface UseExploreActionsResult {
  /**
   * Items to display in the popover dropdown
   */
  exploreActionItems: {
    'data-test-subj': string;
    key: string;
    name: React.JSX.Element;
    onClick: () => void;
  }[];
}

export const useExploreActions = ({
  hit,
  closePopover,
}: UseExploreActionsParams): UseExploreActionsResult => {
  const { services } = useKibana();

  const { url, label } = useMemo(() => {
    const timelinesURL = services.application.getUrlForApp('securitySolutionUI', {
      path: 'alerts',
    });
    return getExploreButtonInfo(hit, timelinesURL);
  }, [hit, services.application]);

  const onClick = useCallback(() => {
    closePopover();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [closePopover, url]);

  const exploreActionItems = useMemo(
    () => [
      {
        'data-test-subj': 'explore-in-alerts-or-timeline',
        key: 'explore-action',
        name: (
          <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexStart">
            <EuiFlexItem grow={false}>{label}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="external" size="m" aria-hidden={true} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        onClick,
      },
    ],
    [label, onClick]
  );

  return { exploreActionItems };
};
