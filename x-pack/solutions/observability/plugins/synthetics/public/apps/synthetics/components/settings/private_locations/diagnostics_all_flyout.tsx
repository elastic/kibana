/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiStat,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiProgress,
  EuiHealth,
  EuiIcon,
  EuiToolTip,
  EuiAccordion,
  EuiBadge,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAllPolicySizes } from './hooks/use_all_policy_sizes';
import type { LocationDiagnostic } from './hooks/use_all_policy_sizes';

const getSeverityColor = (diagnostic: LocationDiagnostic): string => {
  if (diagnostic.error) return 'danger';
  if (diagnostic.exceedsDefault) return 'danger';
  if (diagnostic.utilizationPercent > 75) return 'warning';
  return 'success';
};

const getSeverityLabel = (diagnostic: LocationDiagnostic): string => {
  if (diagnostic.error) return ERROR_LABEL;
  if (diagnostic.exceedsDefault) return CRITICAL_LABEL;
  if (diagnostic.utilizationPercent > 75) return WARNING_LABEL;
  return HEALTHY_LABEL;
};

const LocationDiagnosticCard = ({ diagnostic }: { diagnostic: LocationDiagnostic }) => {
  const severityColor = getSeverityColor(diagnostic);
  const accordionId = useGeneratedHtmlId({ prefix: 'diagnostic', suffix: diagnostic.locationId });

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={severityColor} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{diagnostic.locationName}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color={severityColor === 'success' ? 'default' : severityColor}>
              {getSeverityLabel(diagnostic)}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="m"
      initialIsOpen={severityColor !== 'success'}
    >
      {diagnostic.error ? (
        <EuiCallOut title={LOCATION_ERROR_TITLE} color="danger" iconType="error" size="s">
          <p>{diagnostic.error}</p>
        </EuiCallOut>
      ) : (
        <>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiStat
                title={diagnostic.policySizeFormatted}
                description={POLICY_SIZE_LABEL}
                titleSize="xs"
                titleColor={severityColor}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={diagnostic.inputCount}
                description={INPUT_COUNT_LABEL}
                titleSize="xs"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                title={`${diagnostic.utilizationPercent}%`}
                description={UTILIZATION_SHORT_LABEL}
                titleSize="xs"
                titleColor={severityColor}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiProgress
            value={Math.min(diagnostic.utilizationPercent, 100)}
            max={100}
            color={severityColor}
            size="m"
            label={
              <EuiText size="xs" color="subdued">
                {UTILIZATION_LABEL}
              </EuiText>
            }
            valueText={`${diagnostic.policySizeFormatted} / ${diagnostic.defaultMaxCheckinFormatted}`}
          />
        </>
      )}
    </EuiAccordion>
  );
};

export const DiagnosticsAllFlyout = ({ onClose }: { onClose: () => void }) => {
  const { data, loading, error, fetchAllPolicySizes } = useAllPolicySizes();
  const flyoutTitleId = useGeneratedHtmlId();

  useEffect(() => {
    fetchAllPolicySizes();
  }, [fetchAllPolicySizes]);

  const sortedLocations = useMemo(() => {
    if (!data?.locations) return [];
    return [...data.locations].sort((a, b) => {
      const severityOrder = (d: LocationDiagnostic) => {
        if (d.error) return 0;
        if (d.exceedsDefault) return 1;
        if (d.utilizationPercent > 75) return 2;
        return 3;
      };
      return severityOrder(a) - severityOrder(b);
    });
  }, [data]);

  const summaryColor = useMemo(() => {
    if (!data) return 'subdued';
    if (data.locationsWithIssues > 0) return 'danger';
    return 'success';
  }, [data]);

  return (
    <EuiFlyout onClose={onClose} css={{ width: 600 }} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="inspect" size="l" />
              </EuiFlexItem>
              <EuiFlexItem>{FLYOUT_TITLE}</EuiFlexItem>
            </EuiFlexGroup>
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {FLYOUT_DESCRIPTION}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading && (
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            direction="column"
            css={{ minHeight: 200 }}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {LOADING_LABEL}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {error && !loading && (
          <EuiCallOut title={ERROR_TITLE} color="danger" iconType="error">
            <p>{error.message}</p>
          </EuiCallOut>
        )}

        {data && !loading && (
          <>
            <EuiPanel hasBorder>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiStat
                    title={data.totalLocations}
                    description={TOTAL_LOCATIONS_LABEL}
                    titleSize="m"
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    title={data.locationsWithIssues}
                    description={
                      <EuiToolTip content={ISSUES_TOOLTIP}>
                        <span>{LOCATIONS_WITH_ISSUES_LABEL}</span>
                      </EuiToolTip>
                    }
                    titleSize="m"
                    titleColor={summaryColor}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>

            <EuiSpacer size="l" />

            {data.locationsWithIssues > 0 && (
              <>
                <EuiCallOut title={ISSUES_FOUND_TITLE} color="warning" iconType="warning">
                  <p>{ISSUES_FOUND_DESCRIPTION}</p>
                </EuiCallOut>
                <EuiSpacer size="l" />
              </>
            )}

            {data.totalLocations === 0 && (
              <EuiCallOut title={NO_LOCATIONS_TITLE} color="primary" iconType="iInCircle">
                <p>{NO_LOCATIONS_DESCRIPTION}</p>
              </EuiCallOut>
            )}

            {sortedLocations.map((diagnostic) => (
              <React.Fragment key={diagnostic.locationId}>
                <LocationDiagnosticCard diagnostic={diagnostic} />
                <EuiSpacer size="s" />
              </React.Fragment>
            ))}
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const FLYOUT_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.flyoutTitle',
  { defaultMessage: 'Private locations diagnostics' }
);

const FLYOUT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.flyoutDescription',
  {
    defaultMessage:
      'Review agent policy size and Fleet Server check-in utilization for all private locations.',
  }
);

const LOADING_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.loading',
  { defaultMessage: 'Running diagnostics on all private locations...' }
);

const ERROR_TITLE = i18n.translate('xpack.synthetics.privateLocations.diagnosticsAll.error', {
  defaultMessage: 'Failed to load diagnostics',
});

const TOTAL_LOCATIONS_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.totalLocations',
  { defaultMessage: 'Total locations' }
);

const LOCATIONS_WITH_ISSUES_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.locationsWithIssues',
  { defaultMessage: 'With issues' }
);

const ISSUES_TOOLTIP = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.issuesTooltip',
  {
    defaultMessage:
      'Locations exceeding 75% of the default Fleet Server check-in body size limit, or with errors.',
  }
);

const ISSUES_FOUND_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.issuesFound',
  { defaultMessage: 'Issues detected' }
);

const ISSUES_FOUND_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.issuesFoundDesc',
  {
    defaultMessage:
      'One or more private locations have agent policies approaching or exceeding the default Fleet Server check-in body size limit. Expand each location below for details.',
  }
);

const NO_LOCATIONS_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.noLocations',
  { defaultMessage: 'No private locations' }
);

const NO_LOCATIONS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.noLocationsDesc',
  { defaultMessage: 'Create a private location to run diagnostics.' }
);

const POLICY_SIZE_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.policySize',
  { defaultMessage: 'Policy size' }
);

const INPUT_COUNT_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.inputCount',
  { defaultMessage: 'Inputs' }
);

const UTILIZATION_SHORT_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.utilizationShort',
  { defaultMessage: 'Utilization' }
);

const UTILIZATION_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.utilization',
  { defaultMessage: 'Fleet Server check-in utilization' }
);

const LOCATION_ERROR_TITLE = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.locationError',
  { defaultMessage: 'Failed to retrieve diagnostics for this location' }
);

const HEALTHY_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.healthy',
  { defaultMessage: 'Healthy' }
);

const WARNING_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.warning',
  { defaultMessage: 'Warning' }
);

const CRITICAL_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.critical',
  { defaultMessage: 'Critical' }
);

const ERROR_LABEL = i18n.translate(
  'xpack.synthetics.privateLocations.diagnosticsAll.errorLabel',
  { defaultMessage: 'Error' }
);
