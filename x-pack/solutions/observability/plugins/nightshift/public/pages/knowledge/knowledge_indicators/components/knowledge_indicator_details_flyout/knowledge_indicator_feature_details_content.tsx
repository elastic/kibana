/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { AggregatedFeature } from '@kbn/significant-events-schema';
import { upperFirst } from 'lodash';
import React, { useMemo } from 'react';
import { useDeveloperMode } from '../../../../hooks/use_developer_mode';
import { DeveloperModeBadge } from '../../../../components/ui/developer_mode_badge';
import { InfoPanel } from '../../../../components/ui/info_panel';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../../common/ebt_constants';
import { getConfidenceColor } from '../../../../common/get_confidence_color';
import { DurabilityBadge } from '../durability_badge';

interface Props {
  /** Top-level fields belong to the viewed instance, which need not be the representative. */
  feature: AggregatedFeature;
  getSourceTitle: (sourceId: string) => string;
  onSelectInstance: (uuid: string) => void;
  onOpenInDiscover?: () => void;
}

export function KnowledgeIndicatorFeatureDetailsContent({
  feature,
  getSourceTitle,
  onSelectInstance,
  onOpenInDiscover,
}: Props) {
  const { instances } = feature;
  const { isDeveloperMode } = useDeveloperMode();
  const listItems = useMemo(() => {
    const tags = feature.tags?.length ? feature.tags : [];

    return [
      {
        title: DETAILS_ID_LABEL,
        description: (
          <EuiText size="s" data-test-subj="significantEventsAppFeatureDetailsFlyoutId">
            {feature.id}
          </EuiText>
        ),
      },
      {
        title: DETAILS_TYPE_LABEL,
        description: <EuiBadge color="hollow">{upperFirst(feature.type)}</EuiBadge>,
      },
      {
        title: DETAILS_SUBTYPE_LABEL,
        description: <EuiBadge color="hollow">{feature.subtype ?? EMPTY_VALUE}</EuiBadge>,
      },
      {
        title: DETAILS_PROPERTIES_LABEL,
        description: (
          <EuiText size="s">
            {Object.entries(feature.properties)
              .filter(([, value]) => typeof value === 'string')
              .map(([key, value]) => (
                <EuiText size="s" key={key}>
                  <strong>{key}</strong> {value as string}
                </EuiText>
              ))}
          </EuiText>
        ),
      },
      {
        title: DETAILS_CONFIDENCE_LABEL,
        description: (
          <EuiHealth color={getConfidenceColor(feature.confidence)}>{feature.confidence}</EuiHealth>
        ),
      },
      {
        title: DETAILS_TAGS_LABEL,
        description:
          tags.length > 0 ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {tags.map((tag) => (
                <EuiFlexItem key={tag} grow={false}>
                  <EuiBadge color="hollow">{tag}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            <EuiText size="s">{EMPTY_VALUE}</EuiText>
          ),
      },
      {
        title: DETAILS_UPDATED_AT_LABEL,
        description: <EuiText size="s">{feature.updated_at || EMPTY_VALUE}</EuiText>,
      },
    ];
  }, [feature]);

  const evidence = feature.evidence?.length ? feature.evidence : [];
  const hasMeta = Object.keys(feature.meta ?? {}).length > 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <InfoPanel
          title={GENERAL_INFORMATION_LABEL}
          headerRightContent={
            onOpenInDiscover ? (
              <EuiButtonEmpty
                data-test-subj="significantEventsAppFeatureDetailsFlyoutOpenInDiscover"
                size="xs"
                iconType="discoverApp"
                iconSide="left"
                onClick={onOpenInDiscover}
              >
                {OPEN_IN_DISCOVER_LABEL}
              </EuiButtonEmpty>
            ) : undefined
          }
        >
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
      {instances.length > 1 && (
        <EuiFlexItem data-test-subj="significantEventsAppFeatureDetailsFlyoutSources">
          <InfoPanel title={SOURCES_LABEL}>
            <EuiText size="xs" color="subdued">
              {SOURCES_HINT}
            </EuiText>
            <EuiHorizontalRule margin="s" />
            {instances.map((instance, index) => {
              const isViewed = instance.uuid === feature.uuid;
              const sourceTitle = getSourceTitle(instance.source_id);
              return (
                <React.Fragment key={instance.uuid}>
                  <EuiFlexGroup
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    data-test-subj={`significantEventsAppFeatureDetailsFlyoutSource-${instance.uuid}`}
                    aria-current={isViewed ? 'true' : undefined}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={isViewed ? 'check' : 'empty'}
                        size="s"
                        aria-label={isViewed ? VIEWING_SOURCE_LABEL : undefined}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText size="s">
                        {isViewed ? (
                          <strong>{sourceTitle}</strong>
                        ) : (
                          <EuiButtonEmpty
                            size="xs"
                            flush="left"
                            data-test-subj="nightshiftKnowledgeIndicatorFeatureDetailsContentLink"
                            onClick={() => onSelectInstance(instance.uuid)}
                            {...getEbtProps({
                              action: NIGHTSHIFT_EBT_ACTIONS.VIEW_KNOWLEDGE_INDICATOR_SOURCE,
                              element: NIGHTSHIFT_EBT_ELEMENTS.KNOWLEDGE_INDICATOR_FLYOUT,
                            })}
                          >
                            {sourceTitle}
                          </EuiButtonEmpty>
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiHealth color={getConfidenceColor(instance.confidence)}>
                        {instance.confidence}
                      </EuiHealth>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <DurabilityBadge expiresAt={instance.expires_at} compact />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {index < instances.length - 1 && <EuiHorizontalRule margin="s" />}
                </React.Fragment>
              );
            })}
          </InfoPanel>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <InfoPanel title={DESCRIPTION_LABEL}>
          <EuiText>{feature.description || NO_DESCRIPTION_AVAILABLE}</EuiText>
        </InfoPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <InfoPanel title={EVIDENCE_LABEL}>
          {evidence.length > 0 ? (
            evidence.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiHealth color="subdued" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">{item}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                {index < evidence.length - 1 && <EuiHorizontalRule margin="m" />}
              </React.Fragment>
            ))
          ) : (
            <EuiText size="s">{NO_EVIDENCE_AVAILABLE}</EuiText>
          )}
        </InfoPanel>
      </EuiFlexItem>
      {isDeveloperMode && (
        <>
          <EuiFlexItem data-test-subj="significantEventsAppFeatureDetailsFlyoutMeta">
            <InfoPanel title={META_LABEL} headerRightContent={<DeveloperModeBadge />}>
              {hasMeta ? (
                <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable>
                  {JSON.stringify(feature.meta ?? {}, null, 2)}
                </EuiCodeBlock>
              ) : (
                <EuiText size="s">{NO_META_AVAILABLE}</EuiText>
              )}
            </InfoPanel>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="significantEventsAppFeatureDetailsFlyoutRawDocument">
            <InfoPanel title={RAW_DOCUMENT_LABEL} headerRightContent={<DeveloperModeBadge />}>
              <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable>
                {JSON.stringify(feature, null, 2)}
              </EuiCodeBlock>
            </InfoPanel>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
}

const GENERAL_INFORMATION_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.generalInformationLabel',
  {
    defaultMessage: 'General information',
  }
);

const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.openInDiscoverLabel',
  {
    defaultMessage: 'Open in Discover',
  }
);

const DETAILS_TYPE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.typeLabel',
  {
    defaultMessage: 'Type',
  }
);

const DETAILS_ID_LABEL = i18n.translate('xpack.nightshift.knowledge.featureDetailsFlyout.idLabel', {
  defaultMessage: 'ID',
});

const DETAILS_SUBTYPE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.subtypeLabel',
  {
    defaultMessage: 'Subtype',
  }
);

const DETAILS_PROPERTIES_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.propertiesLabel',
  {
    defaultMessage: 'Properties',
  }
);

const DETAILS_CONFIDENCE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.confidenceLabel',
  {
    defaultMessage: 'Confidence',
  }
);

const DETAILS_TAGS_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.tagsLabel',
  {
    defaultMessage: 'Tags',
  }
);

const DETAILS_UPDATED_AT_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.updatedAtLabel',
  {
    defaultMessage: 'Updated',
  }
);

const SOURCES_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.sourcesLabel',
  {
    defaultMessage: 'Sources',
  }
);

const SOURCES_HINT = i18n.translate('xpack.nightshift.knowledge.featureDetailsFlyout.sourcesHint', {
  defaultMessage: 'This feature was identified in several sources. Select one to view its details.',
});

const VIEWING_SOURCE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.viewingSourceLabel',
  {
    defaultMessage: 'Currently viewing',
  }
);

const DESCRIPTION_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.descriptionLabel',
  {
    defaultMessage: 'Description',
  }
);

const NO_DESCRIPTION_AVAILABLE = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.noDescriptionAvailable',
  {
    defaultMessage: 'No description available',
  }
);

const EVIDENCE_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.evidenceLabel',
  {
    defaultMessage: 'Evidence',
  }
);

const NO_EVIDENCE_AVAILABLE = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.noEvidenceAvailable',
  {
    defaultMessage: 'No evidence available',
  }
);

const META_LABEL = i18n.translate('xpack.nightshift.knowledge.featureDetailsFlyout.metaLabel', {
  defaultMessage: 'Meta',
});

const NO_META_AVAILABLE = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.noMetaAvailable',
  {
    defaultMessage: 'No meta information',
  }
);

const RAW_DOCUMENT_LABEL = i18n.translate(
  'xpack.nightshift.knowledge.featureDetailsFlyout.rawDocumentLabel',
  {
    defaultMessage: 'Raw document',
  }
);

const EMPTY_VALUE = i18n.translate('xpack.nightshift.knowledge.featureDetailsFlyout.emptyValue', {
  defaultMessage: '-',
});
