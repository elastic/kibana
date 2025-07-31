/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { get } from 'lodash/fp';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { EuiDataGridCellValueElementProps, EuiSpacer, EuiText } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { generateFilters } from '@kbn/data-plugin/public';
import type { CspVulnerabilityFinding } from '@kbn/cloud-security-posture-common/schema/vulnerabilities/latest';
import {
  ActionableBadge,
  CVSScoreBadge,
  SeverityStatusBadge,
  getNormalizedSeverity,
  MultiValueCellAction,
  MultiValueCellPopover,
  findReferenceLink,
} from '@kbn/cloud-security-posture';
import { getVendorName } from '@kbn/cloud-security-posture/src/utils/get_vendor_name';
import { HttpSetup } from '@kbn/core/public';
import { useLatestVulnerabilitiesTable } from './hooks/use_latest_vulnerabilities_table';
import { LATEST_VULNERABILITIES_TABLE } from './test_subjects';
import { getDefaultQuery, defaultColumns } from './constants';
import { ErrorCallout } from '../configurations/layout/error_callout';
import { createDetectionRuleFromVulnerabilityFinding } from './utils/create_detection_rule_from_vulnerability';
import { vulnerabilitiesTableFieldLabels } from './vulnerabilities_table_field_labels';
import { FindingsBaseURLQuery } from '../../common/types';
import { useKibana } from '../../common/hooks/use_kibana';
import { useDataViewContext } from '../../common/contexts/data_view_context';
import { usePersistedQuery } from '../../common/hooks/use_cloud_posture_data_table';
import { useUrlQuery } from '../../common/hooks/use_url_query';
import { EMPTY_VALUE } from '../configurations/findings_flyout/findings_flyout';
import { AddFieldFilterHandler } from './types';
import { CloudSecurityDataTable } from '../../components/cloud_security_data_table';

type URLQuery = FindingsBaseURLQuery & Record<string, any>;

interface LatestVulnerabilitiesTableProps {
  groupSelectorComponent?: JSX.Element;
  height?: number;
  nonPersistedFilters?: Filter[];
}
/**
 * Type Guard for checking if the given source has a vulnerability object
 * Since id might be empty with the introduction of 3rd party vulnerabilities
 * we need another to check to know if finding can be displayed in the flyout
 */
const isVulnerabilityFinding = (
  source: Record<string, any> | undefined
): source is CspVulnerabilityFinding => {
  return 'vulnerability' in (source ?? {});
};

const getCspVulnerabilityFinding = (
  source: Record<string, any> | undefined
): CspVulnerabilityFinding | false => {
  return isVulnerabilityFinding(source) && source;
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

const onOpenFlyoutCallback = (): JSX.Element => {
  return <></>;
};

const title = i18n.translate('xpack.csp.findings.latestVulnerabilities.tableRowTypeLabel', {
  defaultMessage: 'Vulnerabilities',
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
    const vulnerabilityFinding = getCspVulnerabilityFinding(rows[rowIndex]?.raw._source);
    if (!vulnerabilityFinding) return;

    return async (http: HttpSetup) =>
      createDetectionRuleFromVulnerabilityFinding(http, vulnerabilityFinding);
  };

  const { data } = useKibana().services;
  const { filterManager } = data.query;
  const { dataView } = useDataViewContext();
  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { setUrlQuery } = useUrlQuery<URLQuery>(getPersistedDefaultQuery);

  const onAddFilter = useCallback<AddFieldFilterHandler>(
    (clickedField, value, operation) => {
      const newFilters = generateFilters(filterManager, clickedField, value, operation, dataView);
      filterManager.addFilters(newFilters);
      setUrlQuery({
        filters: filterManager.getFilters(),
      });
    },
    [dataView, filterManager, setUrlQuery]
  );

  const renderActionableBadge = useCallback(
    (item: string, i: number, field: string, object: CspVulnerabilityFinding) => {
      const references = Array.isArray(object.vulnerability.reference)
        ? object.vulnerability.reference
        : [object.vulnerability.reference];

      const actions: MultiValueCellAction[] = [
        {
          onClick: () => onAddFilter(field, item, '+'),
          iconType: 'plusInCircle',
          ariaLabel: i18n.translate('xpack.csp.latestVulnerabilities.table.addFilter', {
            defaultMessage: 'Add filter',
          }),
          title: i18n.translate('xpack.csp.latestVulnerabilities.table.filterForTitle', {
            defaultMessage: 'Filter for this {value}',
            values: { value: field },
          }),
        },
        {
          onClick: () => onAddFilter(field, item, '-'),
          iconType: 'minusInCircle',
          ariaLabel: i18n.translate('xpack.csp.latestVulnerabilities.table.removeFilter', {
            defaultMessage: 'Remove filter',
          }),
          title: i18n.translate('xpack.csp.latestVulnerabilities.table.filterOutTitle', {
            defaultMessage: 'Filter out this {value}',
            values: { value: field },
          }),
        },
        ...(field === 'vulnerability.id' && findReferenceLink(references, item)
          ? [
              {
                onClick: () => window.open(findReferenceLink(references, item)!, '_blank'),
                iconType: 'popout',
                ariaLabel: i18n.translate('xpack.csp.latestVulnerabilities.table.openUrlInWindow', {
                  defaultMessage: 'Open URL in window',
                }),
                title: i18n.translate('xpack.csp.latestVulnerabilities.table.openUrlInWindow', {
                  defaultMessage: 'Open URL in window',
                }),
              },
            ]
          : []),
      ];

      return <ActionableBadge key={`${item}-${i}`} item={item} index={i} actions={actions} />;
    },
    [onAddFilter]
  );

  const renderMultiValueCell = (field: string, finding: CspVulnerabilityFinding) => {
    const value = get(field, finding);

    if (!Array.isArray(value)) {
      return <EuiText size="s">{value || EMPTY_VALUE}</EuiText>;
    }

    return (
      <MultiValueCellPopover<CspVulnerabilityFinding>
        items={value}
        field={field}
        object={finding}
        renderItem={renderActionableBadge}
        firstItemRenderer={(item) => <EuiText size="s">{item}</EuiText>}
      />
    );
  };

  const customCellRenderer = (tableRows: DataTableRecord[]) => {
    return {
      'vulnerability.score.base': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
        <CspVulnerabilityFindingRenderer row={tableRows[rowIndex]}>
          {({ finding }) => (
            <CVSScoreBadge
              score={finding.vulnerability?.score?.base}
              version={finding.vulnerability?.score?.version}
            />
          )}
        </CspVulnerabilityFindingRenderer>
      ),
      'vulnerability.severity': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
        <CspVulnerabilityFindingRenderer row={tableRows[rowIndex]}>
          {({ finding }) => (
            <SeverityStatusBadge severity={getNormalizedSeverity(finding.vulnerability.severity)} />
          )}
        </CspVulnerabilityFindingRenderer>
      ),
      'observer.vendor': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
        <CspVulnerabilityFindingRenderer row={tableRows[rowIndex]}>
          {({ finding }) => <>{getVendorName(finding) || '-'}</>}
        </CspVulnerabilityFindingRenderer>
      ),
      'vulnerability.id': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
        <CspVulnerabilityFindingRenderer row={tableRows[rowIndex]}>
          {({ finding }) => renderMultiValueCell('vulnerability.id', finding)}
        </CspVulnerabilityFindingRenderer>
      ),
      'package.name': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
        <CspVulnerabilityFindingRenderer row={rows[rowIndex]}>
          {({ finding }) => renderMultiValueCell('package.name', finding)}
        </CspVulnerabilityFindingRenderer>
      ),
      'package.version': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
        <CspVulnerabilityFindingRenderer row={rows[rowIndex]}>
          {({ finding }) => renderMultiValueCell('package.version', finding)}
        </CspVulnerabilityFindingRenderer>
      ),
      'package.fixed_version': ({ rowIndex }: EuiDataGridCellValueElementProps) => (
        <CspVulnerabilityFindingRenderer row={rows[rowIndex]}>
          {({ finding }) => renderMultiValueCell('package.fixed_version', finding)}
        </CspVulnerabilityFindingRenderer>
      ),
    };
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
          onOpenFlyoutCallback={onOpenFlyoutCallback}
          createRuleFn={createVulnerabilityRuleFn}
          cloudPostureDataTable={cloudPostureDataTable}
          loadMore={fetchNextPage}
          title={title}
          customCellRenderer={customCellRenderer}
          groupSelectorComponent={groupSelectorComponent}
          height={height}
          hasDistributionBar={false}
          columnHeaders={vulnerabilitiesTableFieldLabels}
          flyoutType="vulnerability"
        />
      )}
    </>
  );
};
