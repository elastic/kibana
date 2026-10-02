/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiAccordion,
  EuiButtonEmpty,
  useGeneratedHtmlId,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { SIGNIFICANT_EVENTS_APP_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type { Feature, StreamQuery } from '@kbn/significant-events-schema';
import { COMPUTED_FEATURE_TYPES } from '@kbn/significant-events-schema';
import React, { useMemo } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { SeverityBadge } from '../../../pages/significant_events/components/severity_badge/severity_badge';
import { RuleControls } from '../../../pages/detection/rule_controls';
import { InfoPanel } from '../../info_panel';
import { SparkPlot } from '../../spark_plot';

const COMPUTED_FEATURE_TYPE_SET = new Set<string>(COMPUTED_FEATURE_TYPES);

interface Props {
  query: StreamQuery;
  occurrences?: Array<{ x: number; y: number }>;
  streamFeatures?: Feature[];
  streamName?: string;
  onUpdated?: () => void;
}

export function KnowledgeIndicatorQueryDetailsContent({
  query,
  occurrences,
  streamFeatures = [],
  streamName,
  onUpdated,
}: Props) {
  const { core } = useKibana();
  const queryId = useGeneratedHtmlId({ prefix: 'ruleQuery' });
  const featureIdSet = useMemo(() => new Set(streamFeatures.map((f) => f.id)), [streamFeatures]);

  const inferredFeatureIds = useMemo(
    () =>
      (query.features ?? [])
        .map((f) => f.id)
        .filter((id) => !COMPUTED_FEATURE_TYPE_SET.has(id) && featureIdSet.has(id)),
    [query.features, featureIdSet]
  );
  const hasFeatureIds = inferredFeatureIds.length > 0;

  const listItems = [
    {
      title: DETAILS_TYPE_LABEL,
      description: <EuiBadge color="hollow">{QUERY_BADGE_LABEL}</EuiBadge>,
    },
    {
      title: DETAILS_DESCRIPTION_LABEL,
      description: <EuiText size="s">{query.description || EMPTY_VALUE}</EuiText>,
    },
    {
      title: DETAILS_SEVERITY_LABEL,
      description: <SeverityBadge score={query.severity_score} />,
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <RuleControls query={query} streamName={streamName} onSaved={onUpdated} />
      </EuiFlexItem>
      <EuiFlexItem>
        <InfoPanel title={GENERAL_INFORMATION_LABEL}>
          {listItems.map((item, index) => (
            <React.Fragment key={item.title}>
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 2]}
                compressed
                listItems={[item]}
              />
              {index < listItems.length - 1 && <EuiHorizontalRule margin="m" />}
            </React.Fragment>
          ))}
        </InfoPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiAccordion id={queryId} buttonContent={DETAILS_QUERY_LABEL} paddingSize="m">
          <EuiCodeBlock language="esql" fontSize="s" isCopyable>
            {query.esql?.query ?? EMPTY_VALUE}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiFlexItem>
      {hasFeatureIds && (
        <EuiFlexItem>
          <InfoPanel title={SOURCE_FEATURES_LABEL}>
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {inferredFeatureIds.map((featureId) => (
                <EuiFlexItem grow={false} key={featureId}>
                  <EuiButtonEmpty
                    data-test-subj="significantEventsAppKnowledgeIndicatorQueryDetailsContentButton"
                    size="xs"
                    iconType="documents"
                    href={core.application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
                      path: `/knowledge?${new URLSearchParams({
                        knowledgeId: featureId,
                        ...(streamName ? { stream: streamName } : {}),
                      })}`,
                    })}
                  >
                    {streamFeatures.find((feature) => feature.id === featureId)?.title || featureId}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </InfoPanel>
        </EuiFlexItem>
      )}
      {occurrences ? (
        <EuiFlexItem>
          <InfoPanel title={OCCURRENCES_LABEL}>
            <EuiSpacer size="s" />
            <SparkPlot
              id={`knowledge-indicator-details-${query.id}`}
              name={OCCURRENCES_LABEL}
              type="bar"
              timeseries={occurrences}
              annotations={[]}
              height={160}
            />
          </InfoPanel>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

const GENERAL_INFORMATION_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.generalInformationLabel',
  {
    defaultMessage: 'General information',
  }
);

const DETAILS_TYPE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.typeLabel',
  {
    defaultMessage: 'Type',
  }
);

const DETAILS_QUERY_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.seeQueryLabel',
  {
    defaultMessage: 'See query',
  }
);

const DETAILS_SEVERITY_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.severityLabel',
  {
    defaultMessage: 'Severity',
  }
);

const DETAILS_DESCRIPTION_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

const OCCURRENCES_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.occurrencesLabel',
  {
    defaultMessage: 'Occurrences',
  }
);

const QUERY_BADGE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.queryBadgeLabel',
  {
    defaultMessage: 'Query',
  }
);

const EMPTY_VALUE = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.emptyValue',
  {
    defaultMessage: '-',
  }
);

const SOURCE_FEATURES_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorDetails.sourceFeaturesLabel',
  { defaultMessage: 'Knowledge behind this rule' }
);
