/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiCode,
  EuiPanel,
  EuiHealth,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
  type EuiTableSelectionType,
} from '@elastic/eui';
import type { FindingType, SecurityFindingDetail } from '../../../common/endpoint_assets';
import { useSecurityFindingsDetail } from '../hooks/use_security_findings_detail';

export interface SecurityFindingsDetailFlyoutProps {
  hostId: string;
  hostName: string;
  findingType: FindingType;
  summaryCount: number;
  onClose: () => void;
}

/**
 * Format timestamp to a readable format
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get severity color based on detection method or result
 */
const getSeverityColor = (finding: SecurityFindingDetail): 'danger' | 'warning' | 'subdued' => {
  const method = finding.detectionMethod?.toLowerCase() ?? '';
  const result = finding.result?.toLowerCase() ?? '';

  if (method.includes('lotl') || result.includes('untrusted')) {
    return 'danger';
  }
  if (method.includes('hidden') || method.includes('non_whitelist')) {
    return 'warning';
  }
  return 'subdued';
};

/**
 * Badge component for detection method
 */
const MethodBadge: React.FC<{ method: string | undefined }> = ({ method }) => {
  if (!method) return <span>-</span>;

  const color = method.includes('LOTL') ? 'danger' :
                method.includes('HIDDEN') ? 'warning' : 'hollow';

  return (
    <EuiToolTip content={method}>
      <EuiBadge color={color}>
        {method.length > 15 ? `${method.substring(0, 15)}...` : method}
      </EuiBadge>
    </EuiToolTip>
  );
};

/**
 * Expandable row content showing full details
 */
const ExpandedRowContent: React.FC<{ finding: SecurityFindingDetail; findingType: FindingType }> = ({
  finding,
  findingType
}) => {
  const items = useMemo(() => {
    const baseItems = [
      { title: 'Timestamp', description: new Date(finding.timestamp).toLocaleString() },
      { title: 'Action ID', description: finding.actionId || '-' },
    ];

    if (finding.name) {
      baseItems.push({ title: 'Name', description: finding.name });
    }
    if (finding.path) {
      baseItems.push({ title: 'Full Path', description: finding.path });
    }
    if (finding.commandLine) {
      baseItems.push({
        title: 'Command Line',
        description: <EuiCode>{finding.commandLine}</EuiCode> as unknown as string
      });
    }
    if (finding.detectionMethod) {
      baseItems.push({ title: 'Detection Method', description: finding.detectionMethod });
    }
    if (finding.detectionReason) {
      baseItems.push({ title: 'Detection Reason', description: finding.detectionReason });
    }
    if (finding.signatureStatus) {
      baseItems.push({ title: 'Signature Status', description: finding.signatureStatus });
    }
    if (finding.signatureSigner) {
      baseItems.push({ title: 'Signer', description: finding.signatureSigner });
    }
    if (finding.result) {
      baseItems.push({ title: 'Result', description: finding.result });
    }
    if (finding.sha256) {
      baseItems.push({
        title: 'SHA256',
        description: (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiCode>{finding.sha256}</EuiCode>
            </EuiFlexItem>
            {finding.vtLink && (
              <EuiFlexItem grow={false}>
                <EuiLink href={finding.vtLink} target="_blank" external>
                  Check on VirusTotal
                </EuiLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) as unknown as string
      });
    }

    return baseItems;
  }, [finding]);

  return (
    <EuiPanel color="subdued" paddingSize="m">
      <EuiDescriptionList
        type="column"
        listItems={items}
        compressed
        columnWidths={[1, 3]}
      />
    </EuiPanel>
  );
};

/**
 * Get table columns based on finding type
 */
const getColumnsForFindingType = (
  findingType: FindingType,
  expandedRows: Set<string>,
  toggleRowExpanded: (id: string) => void
): Array<EuiBasicTableColumn<SecurityFindingDetail>> => {
  const expandColumn: EuiBasicTableColumn<SecurityFindingDetail> = {
    width: '40px',
    isExpander: true,
    render: (finding: SecurityFindingDetail) => (
      <EuiButtonIcon
        onClick={() => toggleRowExpanded(finding.id)}
        aria-label={expandedRows.has(finding.id) ? 'Collapse' : 'Expand'}
        iconType={expandedRows.has(finding.id) ? 'arrowDown' : 'arrowRight'}
      />
    ),
  };

  const timeColumn: EuiBasicTableColumn<SecurityFindingDetail> = {
    field: 'timestamp',
    name: 'Time',
    width: '110px',
    sortable: true,
    render: (timestamp: string) => (
      <EuiText size="xs" color="subdued">
        {formatTimestamp(timestamp)}
      </EuiText>
    ),
  };

  const nameColumn: EuiBasicTableColumn<SecurityFindingDetail> = {
    field: 'name',
    name: 'Name',
    sortable: true,
    render: (name: string | undefined, finding: SecurityFindingDetail) => (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiHealth color={getSeverityColor(finding)} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiToolTip content={name || '-'}>
            <EuiText size="s">
              <strong>{name || '-'}</strong>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  };

  const vtColumn: EuiBasicTableColumn<SecurityFindingDetail> = {
    field: 'vtLink',
    name: '',
    width: '40px',
    render: (vtLink: string | undefined, finding: SecurityFindingDetail) =>
      vtLink && finding.sha256 ? (
        <EuiToolTip content="Check on VirusTotal">
          <EuiLink href={vtLink} target="_blank">
            <EuiIcon type="popout" size="s" />
          </EuiLink>
        </EuiToolTip>
      ) : null,
  };

  const typeSpecificColumns: Record<FindingType, Array<EuiBasicTableColumn<SecurityFindingDetail>>> = {
    'Suspicious Services': [
      {
        field: 'signatureStatus',
        name: 'Status',
        width: '100px',
        sortable: true,
        render: (status: string | undefined) => (
          <EuiBadge color={status === 'signed' ? 'success' : 'warning'}>
            {status || '-'}
          </EuiBadge>
        ),
      },
      {
        field: 'path',
        name: 'Path',
        truncateText: true,
        render: (path: string | undefined) => (
          <EuiToolTip content={path || '-'}>
            <EuiText size="xs">{path || '-'}</EuiText>
          </EuiToolTip>
        ),
      },
    ],
    'Suspicious Tasks (LOTL)': [
      {
        field: 'detectionMethod',
        name: 'Method',
        width: '140px',
        sortable: true,
        render: (method: string | undefined) => <MethodBadge method={method} />,
      },
      {
        field: 'detectionReason',
        name: 'Reason',
        truncateText: true,
        render: (reason: string | undefined) => (
          <EuiToolTip content={reason || '-'}>
            <EuiText size="xs">{reason || '-'}</EuiText>
          </EuiToolTip>
        ),
      },
    ],
    'Unsigned Processes': [
      {
        field: 'result',
        name: 'Result',
        width: '120px',
        sortable: true,
        render: (result: string | undefined) => (
          <EuiBadge color={result === 'untrusted' ? 'danger' : 'hollow'}>
            {result || '-'}
          </EuiBadge>
        ),
      },
      {
        field: 'path',
        name: 'Path',
        truncateText: true,
        render: (path: string | undefined) => (
          <EuiToolTip content={path || '-'}>
            <EuiText size="xs">{path || '-'}</EuiText>
          </EuiToolTip>
        ),
      },
    ],
  };

  return [expandColumn, timeColumn, nameColumn, ...typeSpecificColumns[findingType], vtColumn];
};

/**
 * Get icon and color for finding type
 */
const getFindingTypeIcon = (findingType: FindingType): { icon: string; color: string } => {
  switch (findingType) {
    case 'Suspicious Services':
      return { icon: 'gear', color: 'warning' };
    case 'Suspicious Tasks (LOTL)':
      return { icon: 'clock', color: 'danger' };
    case 'Unsigned Processes':
      return { icon: 'document', color: 'warning' };
    default:
      return { icon: 'alert', color: 'subdued' };
  }
};

/**
 * Flyout component to display all security findings for a specific host and finding type
 */
export const SecurityFindingsDetailFlyout: React.FC<SecurityFindingsDetailFlyoutProps> = React.memo(
  ({ hostId, hostName, findingType, summaryCount, onClose }) => {
    const { findings, total, loading, error } = useSecurityFindingsDetail(
      hostId,
      hostName,
      findingType,
      true
    );

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRowExpanded = useCallback((id: string) => {
      setExpandedRows((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }, []);

    const columns = useMemo(
      () => getColumnsForFindingType(findingType, expandedRows, toggleRowExpanded),
      [findingType, expandedRows, toggleRowExpanded]
    );

    const { icon, color } = getFindingTypeIcon(findingType);

    const itemIdToExpandedRowMap = useMemo(() => {
      const map: Record<string, React.ReactNode> = {};
      expandedRows.forEach((id) => {
        const finding = findings.find((f) => f.id === id);
        if (finding) {
          map[id] = <ExpandedRowContent finding={finding} findingType={findingType} />;
        }
      });
      return map;
    }, [expandedRows, findings, findingType]);

    const search = {
      box: {
        incremental: true,
        placeholder: 'Search findings...',
      },
    };

    const pagination = {
      initialPageSize: 25,
      pageSizeOptions: [10, 25, 50, 100],
    };

    const sorting = {
      sort: {
        field: 'timestamp' as keyof SecurityFindingDetail,
        direction: 'desc' as const,
      },
    };

    return (
      <EuiFlyout onClose={onClose} size="l" data-test-subj="security-findings-detail-flyout">
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} size="xl" color={color} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2>{findingType}</h2>
              </EuiTitle>
              <EuiText size="s" color="subdued">
                {hostName}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType="database">
                {loading ? '...' : `${total} findings`}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {loading && (
            <EuiEmptyPrompt
              icon={<EuiLoadingSpinner size="xl" />}
              title={<h3>Loading findings...</h3>}
              body={<p>Querying raw osquery data</p>}
            />
          )}

          {error && !loading && (
            <EuiCallOut
              title="Error loading findings"
              color="danger"
              iconType="error"
              data-test-subj="security-findings-detail-error"
            >
              <p>{error.message}</p>
            </EuiCallOut>
          )}

          {!loading && !error && findings.length === 0 && (
            <EuiEmptyPrompt
              iconType="search"
              title={<h3>No findings available</h3>}
              body={
                <p>
                  No raw osquery data found for this host. The raw data may have been aged out.
                </p>
              }
              data-test-subj="security-findings-detail-empty"
            />
          )}

          {!loading && !error && findings.length > 0 && (
            <>
              {total > 100 && (
                <>
                  <EuiCallOut
                    title={`Showing ${Math.min(100, findings.length)} of ${total} findings`}
                    color="warning"
                    iconType="sortDown"
                    size="s"
                  >
                    Results are sorted by most recent first.
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}
              <EuiInMemoryTable
                items={findings}
                columns={columns}
                itemId="id"
                itemIdToExpandedRowMap={itemIdToExpandedRowMap}
                isExpandable={true}
                search={search}
                pagination={pagination}
                sorting={sorting}
                hasActions={true}
                tableLayout="auto"
                data-test-subj="security-findings-detail-table"
              />
            </>
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);

SecurityFindingsDetailFlyout.displayName = 'SecurityFindingsDetailFlyout';
