/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Feature } from '@kbn/significant-events-schema';
import { formatTimestamp } from '../../util/formatters';
import type { DetectionModel } from './model';
import { journey } from './journey_translations';

const categoryOf = (feature: Feature): string =>
  feature.type === 'entity'
    ? ['host', 'cluster', 'container', 'pod'].includes(feature.subtype ?? '')
      ? 'infrastructure'
      : 'services'
    : feature.type === 'technology'
    ? 'technologies'
    : feature.type === 'dependency'
    ? 'dependencies'
    : feature.type === 'infrastructure'
    ? 'infrastructure'
    : 'patterns';

export const KnowledgeBrowser = ({
  features,
  model,
  onInspect,
  onSelectService,
}: {
  features: Feature[];
  model: DetectionModel;
  onInspect: (feature: Feature) => void;
  onSelectService: (id: string) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  const [limit, setLimit] = useState(36);
  const categories = [
    { id: 'all', label: journey.allKnowledge, icon: 'documents' },
    { id: 'services', label: journey.services, icon: 'apps' },
    { id: 'technologies', label: journey.technologies, icon: 'wrench' },
    { id: 'dependencies', label: journey.dependencies, icon: 'graphApp' },
    { id: 'infrastructure', label: journey.infrastructure, icon: 'database' },
    { id: 'patterns', label: journey.patterns, icon: 'visLine' },
  ];
  const visible = useMemo(
    () =>
      features
        .filter(
          (feature) =>
            (showExcluded || !feature.excluded) &&
            (showExpired || !feature.expires_at || Date.parse(feature.expires_at) > Date.now()) &&
            (category === 'all' || categoryOf(feature) === category) &&
            `${feature.title} ${feature.description} ${feature.stream_name} ${JSON.stringify(
              feature.properties
            )}`
              .toLowerCase()
              .includes(search.toLowerCase())
        )
        .sort((a, b) => Date.parse(b.updated_at ?? '') - Date.parse(a.updated_at ?? '')),
    [features, category, search, showExcluded, showExpired]
  );
  return (
    <div data-test-subj="detectionKnowledgeBrowser">
      <EuiTitle size="s">
        <h2>{journey.knowledge}</h2>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>{journey.knowledgeHint}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <div
        css={css`
          display: flex;
          gap: ${euiTheme.size.s};
          flex-wrap: wrap;
        `}
      >
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={category === item.id}
            onClick={() => {
              setCategory(item.id);
              setLimit(36);
            }}
            css={css`
              display: flex;
              align-items: center;
              gap: ${euiTheme.size.s};
              padding: ${euiTheme.size.s} ${euiTheme.size.m};
              border: 1px solid
                ${category === item.id ? euiTheme.colors.primary : euiTheme.colors.borderBasePlain};
              border-radius: ${euiTheme.border.radius.medium};
              background: ${category === item.id
                ? `color-mix(in srgb, ${euiTheme.colors.primary} 8%, transparent)`
                : euiTheme.colors.backgroundBasePlain};
              color: ${category === item.id ? euiTheme.colors.primary : euiTheme.colors.text};
              font-size: ${euiTheme.font.scale.s}rem;
              &:focus-visible {
                outline: 2px solid ${euiTheme.colors.primary};
              }
            `}
          >
            <EuiIcon type={item.icon} aria-hidden={true} />
            {item.label}
            <EuiBadge color="hollow">
              {
                features.filter(
                  (feature) =>
                    (showExcluded || !feature.excluded) &&
                    (showExpired ||
                      !feature.expires_at ||
                      Date.parse(feature.expires_at) > Date.now()) &&
                    (item.id === 'all' || categoryOf(feature) === item.id)
                ).length
              }
            </EuiBadge>
          </button>
        ))}
      </div>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
        <EuiFlexItem>
          <EuiFieldSearch
            data-test-subj="significantEventsAppKnowledgeBrowserFieldSearch"
            compressed
            fullWidth
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(36);
            }}
            placeholder={journey.searchKnowledge}
            aria-label={journey.searchKnowledge}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.significantEventsApp.knowledge.showExpired', {
              defaultMessage: 'Include expired knowledge',
            })}
            checked={showExpired}
            onChange={(event) => setShowExpired(event.target.checked)}
          />
          <EuiSwitch
            compressed
            checked={showExcluded}
            onChange={(event) => setShowExcluded(event.target.checked)}
            label={journey.showExcluded}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {!visible.length && (
        <EuiEmptyPrompt
          iconType="documents"
          titleSize="xs"
          title={<h3>{journey.emptyKnowledge}</h3>}
        />
      )}
      <div
        css={css`
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: ${euiTheme.size.m};
        `}
      >
        {visible.slice(0, limit).map((feature) => {
          const entities = model.entities.filter((entity) =>
            entity.features.some((item) => item.uuid === feature.uuid)
          );
          const rules = new Set(
            entities.flatMap((entity) =>
              entity.queries
                .filter((query) => query.features?.some((reference) => reference.id === feature.id))
                .map((query) => query.id)
            )
          );
          const expired = feature.expires_at && Date.parse(feature.expires_at) < Date.now();
          return (
            <EuiPanel
              key={feature.uuid}
              hasBorder
              hasShadow={false}
              paddingSize="m"
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${euiTheme.size.s};
                border-top: 2px solid
                  ${feature.excluded
                    ? euiTheme.colors.borderBasePlain
                    : categoryOf(feature) === 'dependencies'
                    ? euiTheme.colors.accent
                    : euiTheme.colors.primary};
              `}
            >
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    <p>{feature.subtype?.replace(/_/g, ' ') || feature.type.replace(/_/g, ' ')}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={feature.excluded ? 'default' : expired ? 'warning' : 'hollow'}>
                    {feature.excluded ? journey.excluded : `${feature.confidence}%`}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiButtonEmpty
                data-test-subj="significantEventsAppKnowledgeBrowserButton"
                size="s"
                flush="left"
                onClick={() => onInspect(feature)}
                css={css`
                  align-self: flex-start;
                  text-align: left;
                  height: auto;
                `}
              >
                {feature.title || feature.id}
              </EuiButtonEmpty>
              <EuiText size="xs" color="subdued">
                <p
                  css={css`
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                  `}
                >
                  {feature.description}
                </p>
              </EuiText>
              <div
                css={css`
                  margin-top: auto;
                  padding-top: ${euiTheme.size.s};
                  border-top: 1px solid ${euiTheme.colors.borderBasePlain};
                `}
              >
                <EuiFlexGroup gutterSize="xs" wrap>
                  {entities.slice(0, 3).map((entity) => (
                    <EuiFlexItem grow={false} key={entity.id}>
                      <EuiButtonEmpty
                        data-test-subj="significantEventsAppKnowledgeBrowserButton"
                        size="xs"
                        iconType="apps"
                        onClick={() => onSelectService(entity.id)}
                      >
                        {entity.label}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
                <EuiText size="xs" color="subdued">
                  <p>
                    {rules.size} {journey.relatedRules.toLowerCase()}
                  </p>
                  <p>
                    {feature.updated_at ? formatTimestamp(feature.updated_at) : journey.noEstimate}
                  </p>
                  <p
                    css={css`
                      overflow-wrap: anywhere;
                    `}
                  >
                    {feature.stream_name}
                  </p>
                </EuiText>
              </div>
            </EuiPanel>
          );
        })}
      </div>
      {visible.length > limit && (
        <>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            data-test-subj="significantEventsAppKnowledgeBrowserButton"
            onClick={() => setLimit(limit + 36)}
          >
            {journey.browse} · {visible.length - limit}
          </EuiButtonEmpty>
        </>
      )}
    </div>
  );
};
