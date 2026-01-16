/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import type { SoftwareItem } from '../../../common/endpoint_assets';

interface SoftwareExportButtonProps {
  items: SoftwareItem[];
  hostName: string;
  disabled?: boolean;
}

const EXPORT_CSV_LABEL = i18n.translate(
  'xpack.securitySolution.endpointAssets.softwareExport.buttonLabel',
  {
    defaultMessage: 'Export CSV',
  }
);

export const SoftwareExportButton: React.FC<SoftwareExportButtonProps> = React.memo(
  ({ items, hostName, disabled }) => {
    const handleExport = useCallback(() => {
      const headers = ['Name', 'Version', 'Type', 'Path', 'Last Seen'];
      const rows = items.map((item) => [
        item.name,
        item.version,
        item.type,
        item.path ?? '',
        item.lastSeen,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => {
            const escaped = String(cell).replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `software-inventory-${hostName}-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, [items, hostName]);

    return (
      <EuiButton
        iconType="exportAction"
        onClick={handleExport}
        disabled={disabled || items.length === 0}
        size="s"
      >
        {EXPORT_CSV_LABEL}
      </EuiButton>
    );
  }
);

SoftwareExportButton.displayName = 'SoftwareExportButton';
