/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import type { GenericPopoverItem } from '../../popovers/details/use_node_details_popover';
import { NETWORK_PREVIEW_BANNER } from '../../constants';
import { GRAPH_POPOVER_PREVIEW_PANEL } from '../../test_ids';

// Local constant matching security solution definition
const IP_FIELD_TYPE = 'ip';

interface PreviewLinkProps {
  id: string;
  field: string;
  value: string;
  scopeId: string;
  'data-test-subj'?: string;
  children?: React.ReactNode;
}

enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source',
}

/*
 * Placeholder PreviewLink component that mimics the security solution PreviewLink
 * TODO: check if possible to move <PreviewLink> component to a common package and all related dependencies
 * would require refactoring in multiple places across security solution plugin - should be done separately
 */
const PreviewLink: React.FC<PreviewLinkProps> = ({
  id,
  field,
  value,
  scopeId,
  'data-test-subj': dataTestSubj,
  children,
}) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();

  const handleClick = (event: React.MouseEvent) => {
    openPreviewPanel({
      id,
      params: {
        ip: value,
        scopeId,
        flowTarget: field.includes(FlowTargetSourceDest.destination)
          ? FlowTargetSourceDest.destination
          : FlowTargetSourceDest.source,
        banner: NETWORK_PREVIEW_BANNER,
        isPreviewMode: true,
      },
    });
  };

  return (
    <EuiLink onClick={handleClick} data-test-subj={dataTestSubj}>
      {children || value}
    </EuiLink>
  );
};

/**
 * Converts array of primitives to PreviewLink components for use in popovers
 */
export const createPreviewItems = (
  id: string,
  values: string[],
  scopeId: string
): GenericPopoverItem[] =>
  values.map((value, index) => ({
    key: `${index}-${value}`,
    label: (
      <PreviewLink
        id={id}
        field={IP_FIELD_TYPE}
        value={value}
        scopeId={scopeId}
        data-test-subj={GRAPH_POPOVER_PREVIEW_PANEL}
      />
    ),
  }));
