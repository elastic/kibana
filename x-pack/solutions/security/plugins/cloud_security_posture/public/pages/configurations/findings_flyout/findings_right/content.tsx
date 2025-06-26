/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiPanel,
  EuiTabs,
  EuiTab,
  EuiCallOut,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlyoutBody,
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
import { OverviewTab } from '../overview_tab';
import { JsonTab } from '../json_tab';
import { TableTab } from '../table_tab';

type FindingsTab = (typeof tabs)[number];

export const MissingFieldsCallout = ({
  finding,
}: {
  finding: CspFinding | CspVulnerabilityFinding;
}) => {
  const { euiTheme } = useEuiTheme();
  const vendor = getVendorName(finding);

  return (
    <EuiCallOut
      css={{
        borderRadius: 4,
        overflow: 'hidden',
      }}
      size="s"
      iconType="info"
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
      return <OverviewTab data={finding} ruleFlyoutLink={ruleFlyoutLink} />;
    case 'table':
      return <TableTab data={finding} />;
    case 'json':
      return <JsonTab data={finding} />;
    default:
      assertNever(tab);
  }
};

export const FindingsMisconfigurationFlyoutContent = ({ finding }: { finding: CspFinding }) => {
  const [tab, setTab] = useState<FindingsTab>(tabs[0]);
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlexGroup gutterSize={'none'} direction={'column'}>
        <EuiTabs expand>
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
        {finding && (
          <EuiPanel
            hasShadow={false}
            css={css`
              position: relative;
            `}
          >
            <EuiFlyoutBody key={tab.id}>
              {!isNativeCspFinding(finding) && ['overview', 'rule'].includes(tab.id) && (
                <div style={{ marginBottom: euiTheme.size.base }}>
                  <MissingFieldsCallout finding={finding} />
                </div>
              )}
              <FindingsTab tab={tab} finding={finding} />
            </EuiFlyoutBody>
          </EuiPanel>
        )}
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default FindingsMisconfigurationFlyoutContent;
