/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { JsonTab } from '../../../flyout/shared/components/json_tab';

export interface SnapshotJsonFlyoutProps {
  snapshot: string;
  onClose: () => void;
  title?: string;
}

export const SnapshotJsonFlyout: React.FC<SnapshotJsonFlyoutProps> = ({
  snapshot,
  onClose,
  title,
}) => {
  const parsedValue = useMemo(() => {
    try {
      return JSON.parse(snapshot) as Record<string, unknown>;
    } catch {
      return { _parseError: 'Invalid JSON', _raw: snapshot } as Record<string, unknown>;
    }
  }, [snapshot]);

  return (
    <EuiFlyout onClose={onClose} size="m" data-test-subj="case-view-snapshot-json-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{title ?? 'Event document'}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <JsonTab
          value={parsedValue}
          showFooterOffset={false}
          data-test-subj="case-view-snapshot-json"
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

SnapshotJsonFlyout.displayName = 'SnapshotJsonFlyout';
