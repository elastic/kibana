/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type {
  InvestigationLead,
  SignalAnalyzerComparison,
} from '@kbn/signal-investigation-contract';
import { get } from 'lodash';
import {
  type AnalysisToolLink,
  buildLeadDrilldownLabel,
  buildLogRateLeadScope,
  buildLogRatePreviewQuery,
} from './aiops_links';
import {
  type DateFormatter,
  formatComparisonWindows,
  formatLeadShiftMultiplier,
} from './flyout_state';

export const MAX_PREVIEW_SAMPLE_DOCS = 5;

export interface LeadPreviewSampleDoc {
  id: string;
  timestamp?: string;
  leadValue?: string;
  message?: string;
  serviceName?: string;
  hostName?: string;
}

type SampleSearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; docs: readonly LeadPreviewSampleDoc[] }
  | { status: 'error' };

const toDisplayString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value) && value.length > 0) {
    return toDisplayString(value[0]);
  }
  return undefined;
};

/** Reads a flat or nested field value from an Elasticsearch document `_source` object. */
export const readPreviewSourceField = (
  source: Readonly<Record<string, unknown>> | undefined,
  field: string
): string | undefined => {
  if (!source) {
    return undefined;
  }
  if (field in source) {
    const direct = toDisplayString(source[field]);
    if (direct !== undefined) {
      return direct;
    }
  }
  return toDisplayString(get(source, field));
};

const extractHitDocs = (
  rawHits: unknown,
  timeField: string,
  leadField: string
): LeadPreviewSampleDoc[] => {
  if (!Array.isArray(rawHits)) {
    return [];
  }
  return rawHits.slice(0, MAX_PREVIEW_SAMPLE_DOCS).map((hit, index) => {
    const record = typeof hit === 'object' && hit !== null ? (hit as Record<string, unknown>) : {};
    const source =
      typeof record._source === 'object' && record._source !== null
        ? (record._source as Record<string, unknown>)
        : undefined;
    const id =
      typeof record._id === 'string' && record._id.length > 0 ? record._id : `doc-${index}`;
    const timestamp = readPreviewSourceField(source, timeField);
    const leadValue = readPreviewSourceField(source, leadField);
    const message =
      readPreviewSourceField(source, 'message') ?? readPreviewSourceField(source, 'error.message');
    const serviceName = readPreviewSourceField(source, 'service.name');
    const hostName = readPreviewSourceField(source, 'host.name');

    return {
      id,
      ...(timestamp ? { timestamp } : {}),
      ...(leadValue ? { leadValue } : {}),
      ...(message ? { message } : {}),
      ...(serviceName ? { serviceName } : {}),
      ...(hostName ? { hostName } : {}),
    };
  });
};

export interface LeadPreviewProps {
  lead: InvestigationLead;
  seed: InvestigationSeed;
  comparison?: SignalAnalyzerComparison;
  drilldownHref?: string;
  toolLink: AnalysisToolLink;
  data?: DataPublicPluginStart;
  formatDate: DateFormatter;
}

export const LeadPreviewContent = ({
  lead,
  seed,
  comparison,
  drilldownHref,
  toolLink,
  data,
  formatDate,
}: LeadPreviewProps) => {
  const isLogRateLead = lead.analyzerId === 'log_rate_analysis';
  const scope = useMemo(
    () => (isLogRateLead ? buildLogRateLeadScope({ lead, seed }) : undefined),
    [isLogRateLead, lead, seed]
  );
  const isLogRateFieldLead = Boolean(isLogRateLead && scope?.leadField && scope?.leadValue);

  const [sampleState, setSampleState] = useState<SampleSearchState>(() =>
    isLogRateFieldLead && data?.search?.search ? { status: 'loading' } : { status: 'idle' }
  );

  useEffect(() => {
    if (!isLogRateFieldLead || !scope?.leadField || !scope?.leadValue || !data?.search?.search) {
      setSampleState({ status: 'idle' });
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    let subscription: { unsubscribe: () => void } | undefined;

    setSampleState({ status: 'loading' });

    const runSampleSearch = async (): Promise<void> => {
      try {
        let resolvedIndex = scope.indexPattern ?? seed.indexPattern;
        const hasExplicitTimeField =
          typeof lead.locatorParams?.timeField === 'string' &&
          lead.locatorParams.timeField.length > 0;
        let resolvedTimeField = hasExplicitTimeField ? scope.timeField : undefined;

        if ((!resolvedIndex || !resolvedTimeField) && scope.dataViewId && data.dataViews?.get) {
          const dataView = await data.dataViews.get(scope.dataViewId);
          if (!active || controller.signal.aborted) {
            return;
          }
          const dataViewWithPattern = dataView as {
            title?: string;
            timeFieldName?: string;
            getIndexPattern?: () => string;
          };
          const patternFromDataView =
            typeof dataViewWithPattern.getIndexPattern === 'function'
              ? dataViewWithPattern.getIndexPattern()
              : dataViewWithPattern.title;
          resolvedIndex = resolvedIndex ?? patternFromDataView;
          resolvedTimeField = resolvedTimeField ?? dataViewWithPattern.timeFieldName;
        }

        const timeField = resolvedTimeField ?? scope.timeField;
        const leadField = scope.leadField;
        if (!resolvedIndex || !leadField) {
          if (active && !controller.signal.aborted) {
            setSampleState({ status: 'loaded', docs: [] });
          }
          return;
        }

        const sourceFields = Array.from(
          new Set([timeField, leadField, 'message', 'error.message', 'service.name', 'host.name'])
        );
        const query = buildLogRatePreviewQuery(scope, timeField);

        const search$ = data.search.search(
          {
            params: {
              index: resolvedIndex,
              body: {
                size: MAX_PREVIEW_SAMPLE_DOCS,
                track_total_hits: false,
                sort: [{ [timeField]: { order: 'desc' } }],
                _source: sourceFields,
                query,
              },
            },
          },
          {
            abortSignal: controller.signal,
            legacyHitsTotal: false,
          }
        );

        subscription = search$.subscribe({
          next: (response) => {
            if (!active || controller.signal.aborted) {
              return;
            }
            const rawHits = (
              response as { rawResponse?: { hits?: { hits?: unknown } } } | undefined
            )?.rawResponse?.hits?.hits;
            if (!Array.isArray(rawHits)) {
              return;
            }
            setSampleState({
              status: 'loaded',
              docs: extractHitDocs(rawHits, timeField, leadField),
            });
          },
          error: () => {
            if (!active || controller.signal.aborted) {
              return;
            }
            setSampleState({ status: 'error' });
          },
        });
      } catch {
        if (active && !controller.signal.aborted) {
          setSampleState({ status: 'error' });
        }
      }
    };

    void runSampleSearch();

    return () => {
      active = false;
      controller.abort();
      subscription?.unsubscribe();
    };
  }, [data, isLogRateFieldLead, lead, seed, scope]);

  const drilldownLabel = buildLeadDrilldownLabel(lead.analyzerId);
  const shiftBadge = lead.shift ? formatLeadShiftMultiplier(lead.shift) : undefined;

  return (
    <div data-test-subj="signalInvestigationLeadPreview">
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p>
              <strong>{lead.summary}</strong>
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList compressed>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.signalInvestigation.preview.scopeTitle', {
                defaultMessage: 'Scope',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>{lead.relevance}</EuiDescriptionListDescription>
            {comparison ? (
              <>
                <EuiDescriptionListTitle>
                  {i18n.translate('xpack.signalInvestigation.preview.comparisonWindowTitle', {
                    defaultMessage: 'Comparison window',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {formatComparisonWindows(comparison, formatDate)}
                </EuiDescriptionListDescription>
              </>
            ) : lead.occurredAt ? (
              <>
                <EuiDescriptionListTitle>
                  {i18n.translate('xpack.signalInvestigation.preview.occurredAtTitle', {
                    defaultMessage: 'Timestamp',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {formatDate(lead.occurredAt)}
                </EuiDescriptionListDescription>
              </>
            ) : null}
            {scope?.leadField && scope?.leadValue ? (
              <>
                <EuiDescriptionListTitle>
                  {i18n.translate('xpack.signalInvestigation.preview.fieldValueTitle', {
                    defaultMessage: 'Field value',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {`${scope.leadField}: "${scope.leadValue}"`}
                </EuiDescriptionListDescription>
              </>
            ) : null}
            {lead.shift ? (
              <>
                <EuiDescriptionListTitle>
                  {i18n.translate('xpack.signalInvestigation.preview.rateShiftTitle', {
                    defaultMessage: 'Normalized rate shift',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {i18n.translate('xpack.signalInvestigation.preview.rateShiftDescription', {
                    defaultMessage: '{baseline} in baseline to {deviation} in deviation',
                    values: {
                      baseline: lead.shift.baseline,
                      deviation: lead.shift.deviation,
                    },
                  })}
                  {shiftBadge ? (
                    <>
                      {' '}
                      <EuiBadge color="default">{shiftBadge}</EuiBadge>
                    </>
                  ) : null}
                </EuiDescriptionListDescription>
              </>
            ) : null}
            {lead.relatedFields && lead.relatedFields.length > 0 ? (
              <>
                <EuiDescriptionListTitle>
                  {i18n.translate('xpack.signalInvestigation.preview.relatedFieldsTitle', {
                    defaultMessage: 'Other fields with the same value',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription data-test-subj="signalInvestigationPreviewRelatedFields">
                  {lead.relatedFields.join(', ')}
                </EuiDescriptionListDescription>
              </>
            ) : null}
          </EuiDescriptionList>
        </EuiFlexItem>
        {isLogRateFieldLead ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <p>
                <strong>
                  {i18n.translate('xpack.signalInvestigation.preview.sampleDocumentsHeading', {
                    defaultMessage: 'Matching log documents',
                  })}
                </strong>
              </p>
            </EuiText>
            <EuiSpacer size="xs" />
            {sampleState.status === 'loading' ? (
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                responsive={false}
                data-test-subj="signalInvestigationPreviewLoading"
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    <p>
                      {i18n.translate('xpack.signalInvestigation.preview.loadingSamplesMessage', {
                        defaultMessage: 'Loading matching log documents…',
                      })}
                    </p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
            {sampleState.status === 'error' ? (
              <EuiText size="xs" color="subdued" data-test-subj="signalInvestigationPreviewError">
                <p>
                  {i18n.translate('xpack.signalInvestigation.preview.errorSamplesMessage', {
                    defaultMessage: 'Matching log documents could not be loaded.',
                  })}
                </p>
              </EuiText>
            ) : null}
            {sampleState.status === 'loaded' && sampleState.docs.length === 0 ? (
              <EuiText size="xs" color="subdued" data-test-subj="signalInvestigationPreviewEmpty">
                <p>
                  {i18n.translate('xpack.signalInvestigation.preview.emptySamplesMessage', {
                    defaultMessage: 'No matching log documents found in this window.',
                  })}
                </p>
              </EuiText>
            ) : null}
            {sampleState.status === 'loaded' && sampleState.docs.length > 0 ? (
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                responsive={false}
                data-test-subj="signalInvestigationPreviewSampleList"
              >
                {sampleState.docs.map((doc) => {
                  const entityMeta = [doc.serviceName, doc.hostName].filter(Boolean).join(' · ');
                  const headerParts = [
                    doc.timestamp ? formatDate(doc.timestamp) : undefined,
                    entityMeta || undefined,
                  ].filter(Boolean);
                  const primaryText = doc.message ?? doc.leadValue ?? lead.summary;
                  return (
                    <EuiFlexItem key={doc.id} grow={false}>
                      <EuiPanel
                        hasBorder
                        paddingSize="s"
                        hasShadow={false}
                        data-test-subj="signalInvestigationPreviewSampleDoc"
                      >
                        {headerParts.length > 0 ? (
                          <EuiText size="xs" color="subdued">
                            <p>{headerParts.join(' · ')}</p>
                          </EuiText>
                        ) : null}
                        <EuiText size="xs">
                          <p>{primaryText}</p>
                        </EuiText>
                      </EuiPanel>
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            ) : null}
          </EuiFlexItem>
        ) : null}
        {drilldownHref || toolLink.href ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" wrap responsive={false} alignItems="center">
              {drilldownHref ? (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    href={drilldownHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    external
                    data-test-subj="signalInvestigationLeadDrilldownLink"
                    {...getEbtProps({
                      action: 'signalInvestigationLeadDrilldown',
                      element: 'signalInvestigationLeadPreview',
                    })}
                  >
                    {drilldownLabel}
                  </EuiLink>
                </EuiFlexItem>
              ) : null}
              {toolLink.href ? (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    href={toolLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    external
                    data-test-subj="signalInvestigationPreviewToolLink"
                    {...getEbtProps({
                      action: 'signalInvestigationOpenDedicatedTool',
                      element: 'signalInvestigationLeadPreview',
                    })}
                  >
                    {toolLink.label}
                  </EuiLink>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
};

export const LeadPreviewFlyout = ({
  onClose,
  ...props
}: LeadPreviewProps & { onClose: () => void }) => (
  <FlyoutTemplate onClose={onClose}>
    <FlyoutTemplate.Header
      title={i18n.translate('xpack.signalInvestigation.preview.flyoutTitle', {
        defaultMessage: 'Lead details',
      })}
      description={props.toolLink.technique}
    />
    <FlyoutTemplate.Body>
      <LeadPreviewContent {...props} />
    </FlyoutTemplate.Body>
  </FlyoutTemplate>
);
