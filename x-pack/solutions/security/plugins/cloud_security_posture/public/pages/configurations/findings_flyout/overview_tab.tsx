/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBasicTable,
  EuiCopy,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import type {
  EuiDescriptionListProps,
  EuiAccordionProps,
  EuiBasicTableColumn,
  EuiThemeComputed,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
  INTERNAL_FEATURE_FLAGS,
} from '@kbn/cloud-security-posture-common';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { useDataView } from '@kbn/cloud-security-posture/src/hooks/use_data_view';
import { truthy } from '@kbn/cloud-security-posture/src/utils/helpers';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { MultiValueCellPopover, type CspClientPluginStartDeps } from '@kbn/cloud-security-posture';
import { css } from '@emotion/css';
import { COPY_ARIA_LABEL } from '../../../components/copy_button';
import { CodeBlock, CspFlyoutMarkdown, EMPTY_VALUE } from './findings_flyout';
import { FindingsDetectionRuleCounter } from './findings_detection_rule_counter';
import { TruncatedCopyableText } from './findings_right/header';

type Accordion = Pick<EuiAccordionProps, 'title' | 'id' | 'initialIsOpen'> &
  Pick<EuiDescriptionListProps, 'listItems'>;

const renderValue = (item: string) => (
  <EuiFlexGroup gutterSize="xs" direction="row" justifyContent="flexStart" alignItems="center">
    <EuiFlexItem>
      <EuiText
        size="s"
        css={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {item}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiCopy textToCopy={item}>
        {(copy) => (
          <EuiIcon
            aria-label={COPY_ARIA_LABEL}
            className={css`
              &:hover {
                cursor: pointer;
              }
            `}
            onClick={copy}
            type="copy"
          />
        )}
      </EuiCopy>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const renderTableField = (value: string) => {
  if (!value) {
    return <EuiText size="xs">{EMPTY_VALUE}</EuiText>;
  }

  if (Array.isArray(value)) {
    return (
      <MultiValueCellPopover<unknown>
        items={value}
        field=""
        object={{}}
        renderItem={renderValue}
        {...(value.length === 1
          ? { firstItemRenderer: (item) => <TruncatedCopyableText textToCopy={item} /> }
          : {})}
      />
    );
  }

  return (
    <>
      <TruncatedCopyableText textToCopy={value} />
    </>
  );
};

export const columns: Array<EuiBasicTableColumn<any>> = [
  {
    field: 'field',
    name: 'Field',
    'data-test-subj': 'firstNameCell',
  },
  {
    field: 'value',
    name: 'Value',
    truncateText: true,
    render: (value: string) => renderTableField(value),
  },
];

export const convertObjectToArray = (obj: { [key: string]: any }) => {
  if (obj === undefined) return null;
  return Object.keys(obj)
    .filter((key) => key !== 'raw')
    .map((key) => ({
      field: key,
      value: obj[key],
    }));
};

const getResourceList = (data: CspFinding) => [
  {
    title: '',
    description: data ? (
      <EuiPanel>
        <EuiPanel hasBorder>
          <EuiBasicTable
            tableCaption="Demo of EuiBasicTable"
            items={convertObjectToArray(data.resource) || []}
            rowHeader="Field"
            columns={columns}
          />
        </EuiPanel>
      </EuiPanel>
    ) : (
      EMPTY_VALUE
    ),
  },
];

const getDetailsList = (
  data: CspFinding,
  ruleFlyoutLink?: string,
  discoverDataViewLink?: string,
  euiTheme?: EuiThemeComputed<{}>
) => [
  {
    title: (
      <EuiFlexGroup direction="row" gutterSize="m" css={{ marginBottom: euiTheme?.size.xs }}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h1>
              {i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.ruleDescription', {
                defaultMessage: 'Rule Description',
              })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h1>
              <div
                css={{
                  textAlign: 'right',
                  display: 'flex',
                  gap: euiTheme?.size.s,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginBottom: euiTheme?.size.xs,
                }}
              >
                <EuiIcon type="expand" color="primary" />
                <EuiLink href={ruleFlyoutLink} target="_blank" external={false}>
                  {i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.showRuleDetails', {
                    defaultMessage: 'Show rule details',
                  })}
                </EuiLink>
              </div>
            </h1>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    description: data.rule?.description ? (
      <EuiText size="s">{data.rule?.description}</EuiText>
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: (
      <EuiTitle size="xxs" css={{ marginBottom: euiTheme?.size.xs }}>
        <h1>
          {i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.alertsTitle', {
            defaultMessage: 'Alerts',
          })}
        </h1>
      </EuiTitle>
    ),
    description: <FindingsDetectionRuleCounter finding={data} />,
  },
  {
    title: (
      <EuiTitle size="xxs" css={{ marginBottom: euiTheme?.size.xs }}>
        <h1>
          {i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.dataViewTitle', {
            defaultMessage: 'Data View',
          })}
        </h1>
      </EuiTitle>
    ),
    description: discoverDataViewLink ? (
      <EuiLink href={discoverDataViewLink}>{CDR_MISCONFIGURATIONS_INDEX_PATTERN}</EuiLink>
    ) : (
      CDR_MISCONFIGURATIONS_INDEX_PATTERN
    ),
  },
];

export const getRemediationList = (rule: CspFinding['rule']) => [
  {
    title: '',
    description: rule?.remediation ? (
      <CspFlyoutMarkdown>{rule?.remediation}</CspFlyoutMarkdown>
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.rationaleTitle', {
      defaultMessage: 'Rationale',
    }),
    description: rule?.rationale ? (
      <CspFlyoutMarkdown>{rule.rationale}</CspFlyoutMarkdown>
    ) : (
      EMPTY_VALUE
    ),
  },
];

const getEvidenceList = ({ result }: CspFinding) =>
  [
    {
      title: '',
      description: (
        <>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.csp.findings.findingsFlyout.overviewTab.evidenceDescription"
              defaultMessage="The specific resource metadata that was evaluated to generate this posture finding"
            />
          </EuiText>
          <EuiSpacer size={'s'} />
          <CodeBlock language="json">{JSON.stringify(result?.evidence, null, 2)}</CodeBlock>
        </>
      ),
    },
  ].filter(truthy);

export const OverviewTab = ({
  data,
  ruleFlyoutLink,
}: {
  data: CspFinding;
  ruleFlyoutLink?: string;
}) => {
  const { discover } = useKibana<CoreStart & CspClientPluginStartDeps>().services;
  const cdrMisconfigurationsDataView = useDataView(CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX);
  const { euiTheme } = useEuiTheme();

  // link will navigate to our dataview in discover, filtered by the data source of the finding
  const discoverDataViewLink = useMemo(
    () =>
      discover.locator?.getRedirectUrl({
        dataViewId: cdrMisconfigurationsDataView.data?.id,
        ...(data.data_stream?.dataset && {
          filters: [
            {
              meta: {
                type: 'phrase',
                key: 'data_stream.dataset',
              },
              query: {
                match_phrase: {
                  'data_stream.dataset': data.data_stream.dataset,
                },
              },
            },
          ],
        }),
      }),
    [data.data_stream?.dataset, discover.locator, cdrMisconfigurationsDataView.data?.id]
  );

  const hasEvidence = !isEmpty(data.result?.evidence);

  const accordions: Accordion[] = useMemo(
    () =>
      [
        {
          initialIsOpen: true,
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.aboutTitle', {
            defaultMessage: 'About',
          }),
          id: 'detailsAccordion',
          listItems: getDetailsList(data, ruleFlyoutLink, discoverDataViewLink, euiTheme),
        },
        {
          initialIsOpen: true,
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.detailsTitle', {
            defaultMessage: 'Resource',
          }),
          id: 'detailsAccordion',
          listItems: getResourceList(data),
        },
        {
          initialIsOpen: true,
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.remediationTitle', {
            defaultMessage: 'Remediation',
          }),
          id: 'remediationAccordion',
          listItems: getRemediationList(data.rule),
        },
        INTERNAL_FEATURE_FLAGS.showFindingFlyoutEvidence &&
          hasEvidence && {
            initialIsOpen: true,
            title: i18n.translate(
              'xpack.csp.findings.findingsFlyout.overviewTab.evidenceSourcesTitle',
              { defaultMessage: 'Evidence' }
            ),
            id: 'evidenceAccordion',
            listItems: getEvidenceList(data),
          },
      ].filter(truthy),
    [data, discoverDataViewLink, euiTheme, hasEvidence, ruleFlyoutLink]
  );

  return (
    <>
      {accordions.map((accordion) => (
        <React.Fragment key={accordion.id}>
          <EuiAccordion
            id={accordion.id}
            buttonContent={
              <EuiText>
                <strong>{accordion.title}</strong>
              </EuiText>
            }
            arrowDisplay="left"
            initialIsOpen={accordion.initialIsOpen}
          >
            <EuiSpacer size="m" />
            <EuiDescriptionList listItems={accordion.listItems} />
          </EuiAccordion>
          <EuiHorizontalRule />
        </React.Fragment>
      ))}
    </>
  );
};
