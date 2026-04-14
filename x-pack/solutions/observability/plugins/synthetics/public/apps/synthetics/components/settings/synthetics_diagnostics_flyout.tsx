/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fetchSyntheticsDiagnostics } from './hooks/api';
import {
  getDiagnosticsSectionKeysInOrder,
  jsonStringifyDiagnostics,
} from './synthetics_diagnostics_utils';
import {
  downloadSyntheticsDiagnosticsZip,
  showDiagnosticsZipErrorToast,
} from './synthetics_diagnostics_zip_download';

const getSectionTitle = (key: string): string => {
  const titles: Record<string, string> = {
    meta: i18n.translate('xpack.synthetics.diagnostics.section.meta', {
      defaultMessage: 'Environment',
    }),
    overviewStatus: i18n.translate('xpack.synthetics.diagnostics.section.overviewStatus', {
      defaultMessage: 'Overview status',
    }),
    monitors: i18n.translate('xpack.synthetics.diagnostics.section.monitors', {
      defaultMessage: 'Monitors (redacted)',
    }),
    monitorCountByLocationId: i18n.translate('xpack.synthetics.diagnostics.section.monitorCounts', {
      defaultMessage: 'Monitor counts by location',
    }),
    referencedPackagePolicyIds: i18n.translate(
      'xpack.synthetics.diagnostics.section.refPolicyIds',
      {
        defaultMessage: 'Referenced package policy IDs',
      }
    ),
    packagePolicies: i18n.translate('xpack.synthetics.diagnostics.section.packagePolicies', {
      defaultMessage: 'Fleet synthetics package policies',
    }),
    privateLocations: i18n.translate('xpack.synthetics.diagnostics.section.privateLocations', {
      defaultMessage: 'Private locations',
    }),
    privateLocationAgentPolicies: i18n.translate(
      'xpack.synthetics.diagnostics.section.privateLocationAgentPolicies',
      {
        defaultMessage: 'Agent policies (private locations)',
      }
    ),
    fleetAgentPolicies: i18n.translate('xpack.synthetics.diagnostics.section.fleetAgentPolicies', {
      defaultMessage: 'Fleet agent policies',
    }),
    globalParams: i18n.translate('xpack.synthetics.diagnostics.section.globalParams', {
      defaultMessage: 'Global parameters (keys only)',
    }),
    dynamicSettings: i18n.translate('xpack.synthetics.diagnostics.section.dynamicSettings', {
      defaultMessage: 'Dynamic settings',
    }),
    indices: i18n.translate('xpack.synthetics.diagnostics.section.indices', {
      defaultMessage: 'Synthetics indices (mappings, settings, stats)',
    }),
    syntheticsServiceSyncErrors: i18n.translate('xpack.synthetics.diagnostics.section.syncErrors', {
      defaultMessage: 'Synthetics service sync errors',
    }),
  };
  return titles[key] ?? key;
};

export function SyntheticsDiagnosticsFlyoutLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [zipExporting, setZipExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSyntheticsDiagnostics();
      setData(response as Record<string, unknown>);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const onOpen = () => {
    setIsOpen(true);
    void loadDiagnostics();
  };

  const onClose = () => {
    setIsOpen(false);
  };

  const onDownloadZip = async () => {
    if (!data) {
      return;
    }
    setZipExporting(true);
    try {
      await downloadSyntheticsDiagnosticsZip(data);
    } catch (e) {
      showDiagnosticsZipErrorToast(e);
    } finally {
      setZipExporting(false);
    }
  };

  return (
    <>
      <EuiButtonEmpty
        data-test-subj="syntheticsDiagnosticsOpenButton"
        iconType="inspect"
        size="s"
        onClick={onOpen}
      >
        {i18n.translate('xpack.synthetics.diagnostics.openButton', {
          defaultMessage: 'Diagnostics bundle',
        })}
      </EuiButtonEmpty>
      {isOpen ? (
        <EuiFlyout
          ownFocus
          onClose={onClose}
          size="l"
          aria-labelledby="syntheticsDiagnosticsFlyoutTitle"
          data-test-subj="syntheticsDiagnosticsFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id="syntheticsDiagnosticsFlyoutTitle">
                {i18n.translate('xpack.synthetics.diagnostics.flyoutTitle', {
                  defaultMessage: 'Synthetics diagnostics',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {loading ? (
              <EuiLoadingSpinner size="xl" data-test-subj="syntheticsDiagnosticsLoading" />
            ) : null}
            {error ? (
              <EuiCallOut
                announceOnMount
                color="danger"
                title={i18n.translate('xpack.synthetics.diagnostics.loadErrorTitle', {
                  defaultMessage: 'Could not load diagnostics',
                })}
              >
                {error}
              </EuiCallOut>
            ) : null}
            {!loading && !error && data
              ? getDiagnosticsSectionKeysInOrder(data).map((key) => (
                  <React.Fragment key={key}>
                    <EuiAccordion
                      id={`synthetics-diagnostics-${key}`}
                      buttonContent={getSectionTitle(key)}
                      paddingSize="m"
                    >
                      <EuiCodeBlock
                        language="json"
                        isCopyable
                        overflowHeight={360}
                        fontSize="s"
                        data-test-subj={`syntheticsDiagnosticsSection-${key}`}
                      >
                        {jsonStringifyDiagnostics(data[key])}
                      </EuiCodeBlock>
                    </EuiAccordion>
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))
              : null}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiButton
              data-test-subj="syntheticsDiagnosticsDownloadZipButton"
              iconType="download"
              onClick={() => void onDownloadZip()}
              isLoading={zipExporting}
              isDisabled={!data || loading || Boolean(error)}
            >
              {i18n.translate('xpack.synthetics.diagnostics.downloadZipButton', {
                defaultMessage: 'Download ZIP (JSON files)',
              })}
            </EuiButton>
          </EuiFlyoutFooter>
        </EuiFlyout>
      ) : null}
    </>
  );
}
