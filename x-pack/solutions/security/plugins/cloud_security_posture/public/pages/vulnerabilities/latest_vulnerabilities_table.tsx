/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { EuiDataGridCellValueElementProps, EuiSpacer } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { HttpSetup } from '@kbn/core-http-browser';
import type { CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/latest';
import { CVSScoreBadge, SeverityStatusBadge } from '@kbn/cloud-security-posture';
import { getVendorName } from '../../common/utils/get_vendor_name';
import { CloudSecurityDataTable } from '../../components/cloud_security_data_table';
import { useLatestVulnerabilitiesTable } from './hooks/use_latest_vulnerabilities_table';
import { LATEST_VULNERABILITIES_TABLE } from './test_subjects';
import { getDefaultQuery, defaultColumns } from './constants';
import { VulnerabilityFindingFlyout } from './vulnerabilities_finding_flyout/vulnerability_finding_flyout';
import { ErrorCallout } from '../configurations/layout/error_callout';
import { createDetectionRuleFromVulnerabilityFinding } from './utils/create_detection_rule_from_vulnerability';
import { vulnerabilitiesTableFieldLabels } from './vulnerabilities_table_field_labels';

interface LatestVulnerabilitiesTableProps {
  groupSelectorComponent?: JSX.Element;
  height?: number;
  nonPersistedFilters?: Filter[];
}
/**
 * Type Guard for checking if the given source is a CspVulnerabilityFinding
 */
const isCspVulnerabilityFinding = (
  source: Record<string, any> | undefined
): source is CspVulnerabilityFinding => {
  return source?.vulnerability?.id !== undefined;
};

const getCspVulnerabilityFinding = (
  source: Record<string, any> | undefined
): CspVulnerabilityFinding | false => {
  return isCspVulnerabilityFinding(source) && (source as CspVulnerabilityFinding);
};

/**
 * This Wrapper component renders the children if the given row is a CspVulnerabilityFinding
 * it uses React's Render Props pattern
 */
const CspVulnerabilityFindingRenderer = ({
  row,
  children,
}: {
  row: DataTableRecord;
  children: ({ finding }: { finding: CspVulnerabilityFinding }) => JSX.Element;
}) => {
  const finding = getCspVulnerabilityFinding(row.raw._source);
  if (!finding) return <></>;
  return children({ finding });
};

const flyoutComponent = (row: DataTableRecord, onCloseFlyout: () => void): JSX.Element => {
  return (
    <CspVulnerabilityFindingRenderer row={row}>
      {({ finding }) => (
        <VulnerabilityFindingFlyout vulnerabilityRecord={finding} closeFlyout={onCloseFlyout} />
      )}
    </CspVulnerabilityFindingRenderer>
  );
};

const title = i18n.translate('xpack.csp.findings.latestVulnerabilities.tableRowTypeLabel', {
  defaultMessage: 'Vulnerabilities',
});

const customCellRenderer = (rows: DataTableRecord[]) => ({
  'vulnerability.score.base': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
    <CspVulnerabilityFindingRenderer row={rows[rowIndex]}>
      {({ finding }) => (
        <CVSScoreBadge
          score={finding.vulnerability?.score?.base}
          version={finding.vulnerability?.score?.version}
        />
      )}
    </CspVulnerabilityFindingRenderer>
  ),
  'vulnerability.severity': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
    <CspVulnerabilityFindingRenderer row={rows[rowIndex]}>
      {({ finding }) => <SeverityStatusBadge severity={finding.vulnerability.severity} />}
    </CspVulnerabilityFindingRenderer>
  ),
  'observer.vendor': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
    <CspVulnerabilityFindingRenderer row={rows[rowIndex]}>
      {({ finding }) => <>{getVendorName(finding) || '-'}</>}
    </CspVulnerabilityFindingRenderer>
  ),
});

export const LatestVulnerabilitiesTable = ({
  groupSelectorComponent,
  height,
  nonPersistedFilters,
}: LatestVulnerabilitiesTableProps) => {
  const { cloudPostureDataTable, rows, total, error, isFetching, fetchNextPage } =
    useLatestVulnerabilitiesTable({
      getDefaultQuery,
      nonPersistedFilters,
    });

  const createVulnerabilityRuleFn = (rowIndex: number) => {
    const vulnerabilityFinding = getCspVulnerabilityFinding(rows[rowIndex].raw._source);
    if (!vulnerabilityFinding) return;

    return async (http: HttpSetup) =>
      createDetectionRuleFromVulnerabilityFinding(http, vulnerabilityFinding);
  };

  return (
    <>
      {error ? (
        <>
          <EuiSpacer size="m" />
          <ErrorCallout error={error} />
        </>
      ) : (
        <CloudSecurityDataTable
          data-test-subj={LATEST_VULNERABILITIES_TABLE}
          isLoading={isFetching}
          defaultColumns={defaultColumns}
          rows={rows}
          total={total}
          flyoutComponent={flyoutComponent}
          createRuleFn={createVulnerabilityRuleFn}
          cloudPostureDataTable={cloudPostureDataTable}
          loadMore={fetchNextPage}
          title={title}
          customCellRenderer={customCellRenderer}
          groupSelectorComponent={groupSelectorComponent}
          height={height}
          hasDistributionBar={false}
          columnHeaders={vulnerabilitiesTableFieldLabels}
        />
      )}
    </>
  );
};
