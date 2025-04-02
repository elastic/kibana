/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPanel,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTabs,
  EuiTab,
  EuiCallOut,
  EuiFlyoutBody,
  useEuiTheme,
} from '@elastic/eui';
import {
  CSP_MISCONFIGURATIONS_DATASET,
  CspFinding,
  CspVulnerabilityFinding,
} from '@kbn/cloud-security-posture-common';
import { generatePath } from 'react-router-dom';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { benchmarksNavigation, type CspClientPluginStartDeps } from '@kbn/cloud-security-posture';
import { assertNever } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { getVendorName } from '@kbn/cloud-security-posture/src/utils/get_vendor_name';
import { isNativeCspFinding } from '@kbn/cloud-security-posture/src/utils/is_native_csp_finding';
import { FormattedMessage } from '@kbn/i18n-react';

type FindingsTab = (typeof tabs)[number];

const convertObjectToArray = (obj: { [key: string]: any }) => {
  if (obj === undefined) return null;
  return Object.keys(obj)
    .filter((key) => key !== 'raw')
    .map((key) => ({
      field: key,
      value: obj[key],
    }));
};

export const MissingFieldsCallout = ({
  finding,
}: {
  finding: CspFinding | CspVulnerabilityFinding;
}) => {
  const { euiTheme } = useEuiTheme();
  const vendor = getVendorName(finding);

  return (
    <EuiCallOut
      style={{
        borderRadius: 4,
        overflow: 'hidden',
      }}
      size="s"
      iconType="iInCircle"
      title={
        <span style={{ color: euiTheme.colors.text }}>
          <FormattedMessage
            id="xpack.csp.findings.findingsFlyout.calloutTitle"
            defaultMessage="Some fields not provided by {vendor}"
            values={{
              vendor: vendor || 'the vendor',
            }}
          />
        </span>
      }
    />
  );
};

const tabs = [
  {
    id: 'overview',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTabTitle', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: 'table',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.tableTabTitle', {
      defaultMessage: 'Table',
    }),
  },
  {
    id: 'json',
    title: i18n.translate('xpack.csp.findings.findingsFlyout.jsonTabTitle', {
      defaultMessage: 'JSON',
    }),
  },
] as const;

const FindingsTab = ({ tab, finding }: { finding: CspFinding; tab: FindingsTab }) => {
  const { application } = useKibana<CoreStart & CspClientPluginStartDeps>().services;

  const ruleFlyoutLink =
    // currently we only support rule linking for native CSP findings
    finding.data_stream.dataset === CSP_MISCONFIGURATIONS_DATASET &&
    finding.rule?.benchmark?.version &&
    finding.rule?.benchmark?.id &&
    finding.rule?.id
      ? application.getUrlForApp('security', {
          path: generatePath(benchmarksNavigation.rules.path, {
            benchmarkVersion: finding.rule.benchmark.version.split('v')[1], // removing the v from the version
            benchmarkId: finding.rule.benchmark.id,
            ruleId: finding.rule.id,
          }),
        })
      : undefined;

  switch (tab.id) {
    case 'overview':
      //   return <OverviewTab data={finding} ruleFlyoutLink={ruleFlyoutLink} />;
      return <>{'OVERVIEW'}</>;
    case 'table':
      //   return <TableTab data={finding} />;
      return <>{'TABLE'}</>;
    case 'json':
      //   return <JsonTab data={finding} />;
      return <>{'JSON'}</>;
    default:
      assertNever(tab);
  }
};

export const FindingsMisconfigurationFlyoutContent = (data: CspFinding) => {
  const columns: Array<EuiBasicTableColumn<any>> = [
    {
      field: 'field',
      name: 'Field',
      'data-test-subj': 'firstNameCell',
    },
    {
      field: 'value',
      name: 'Value',
      truncateText: true,
    },
  ];
  const [tab, setTab] = useState<FindingsTab>(tabs[0]);

  return (
    <>
      <EuiTabs>
        {tabs.map((v) => (
          <EuiTab
            key={v.id}
            isSelected={tab.id === v.id}
            onClick={() => setTab(v)}
            data-test-subj={`findings_flyout_tab_${v.id}`}
          >
            {v.title}
          </EuiTab>
        ))}
      </EuiTabs>
      {/* {finding && (
        <EuiPanel hasShadow={false}>
          <EuiFlyoutBody key={tab.id}>
            {!isNativeCspFinding(finding) && ['overview', 'rule'].includes(tab.id) && (
              <div style={{ marginBottom: euiTheme.size.base }}>
                <MissingFieldsCallout finding={finding} />
              </div>
            )}
            <FindingsTab tab={tab} finding={finding} />
          </EuiFlyoutBody>
        </EuiPanel>
      )} */}
      <EuiPanel>
        <EuiPanel>
          <EuiBasicTable
            tableCaption="Demo of EuiBasicTable"
            items={convertObjectToArray(data?.resource) || []}
            rowHeader="Field"
            columns={columns}
          />
        </EuiPanel>
      </EuiPanel>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default FindingsMisconfigurationFlyoutContent;
