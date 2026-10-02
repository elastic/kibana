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
  EuiBasicTable,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
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

const copy = {
  finding: i18n.translate('xpack.significantEventsApp.knowledgeCatalog.finding', {
    defaultMessage: 'Finding',
  }),
  confidence: i18n.translate('xpack.significantEventsApp.knowledgeCatalog.confidence', {
    defaultMessage: 'Confidence',
  }),
  confidenceHint: i18n.translate('xpack.significantEventsApp.knowledgeCatalog.confidenceHint', {
    defaultMessage: 'Confidence assigned to this finding during knowledge extraction.',
  }),
  filters: i18n.translate('xpack.significantEventsApp.knowledgeCatalog.filters', {
    defaultMessage: 'Filters',
  }),
  expired: i18n.translate('xpack.significantEventsApp.knowledge.showExpired', {
    defaultMessage: 'Include expired knowledge',
  }),
  type: i18n.translate('xpack.significantEventsApp.knowledgeCatalog.type', {
    defaultMessage: 'Type',
  }),
  usage: i18n.translate('xpack.significantEventsApp.knowledgeCatalog.usage', {
    defaultMessage: 'Used by',
  }),
};

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(36);
  const categories = [
    { id: 'all', label: journey.allKnowledge, icon: 'documents' },
    { id: 'services', label: journey.services, icon: 'apps' },
    { id: 'technologies', label: journey.technologies, icon: 'wrench' },
    { id: 'dependencies', label: journey.dependencies, icon: 'graphApp' },
    { id: 'infrastructure', label: journey.infrastructure, icon: 'database' },
    { id: 'patterns', label: journey.patterns, icon: 'visLine' },
  ];
  const eligible = features.filter(
    (feature) =>
      (showExcluded || !feature.excluded) &&
      (showExpired || !feature.expires_at || Date.parse(feature.expires_at) > Date.now())
  );
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
  const associations = useMemo(
    () =>
      new Map(
        features.map((feature) => {
          const entities = model.entities.filter((entity) =>
            entity.features.some((item) => item.uuid === feature.uuid)
          );
          const rules = new Set(
            entities.flatMap((entity) =>
              entity.queries
                .filter((query) => query.features?.some((reference) => reference.id === feature.id))
                .map((query) => `${query.stream_name}:${query.id}`)
            )
          );
          return [feature.uuid, { entities, rules }];
        })
      ),
    [features, model.entities]
  );
  const columns: Array<EuiBasicTableColumn<Feature>> = [
    {
      name: copy.finding,
      render: (feature: Feature) => (
        <div
          css={css`
            min-width: 0;
          `}
        >
          <EuiButtonEmpty
            data-test-subj="significantEventsAppKnowledgeBrowserButton"
            size="s"
            flush="left"
            onClick={() => onInspect(feature)}
            css={css`
              height: auto;
              text-align: left;
            `}
          >
            {feature.title || feature.id}
          </EuiButtonEmpty>
          <EuiText size="xs" color="subdued">
            <span
              css={css`
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
                max-width: 560px;
              `}
            >
              {feature.description}
            </span>
          </EuiText>
        </div>
      ),
    },
    {
      name: copy.type,
      width: '140px',
      render: (feature: Feature) => (
        <EuiToolTip
          content={
            <EuiText size="xs">
              <p>{feature.stream_name}</p>
              {feature.updated_at && <p>{formatTimestamp(feature.updated_at)}</p>}
            </EuiText>
          }
        >
          <span
            tabIndex={0}
            css={css`
              color: ${euiTheme.colors.textSubdued};
              font-size: ${euiTheme.font.scale.xs}rem;
            `}
          >
            <EuiIcon
              type={categories.find((item) => item.id === categoryOf(feature))?.icon || 'documents'}
              size="s"
              aria-hidden={true}
            />{' '}
            {feature.subtype?.replace(/_/g, ' ') || feature.type.replace(/_/g, ' ')}
          </span>
        </EuiToolTip>
      ),
    },
    {
      name: journey.services,
      width: '180px',
      render: (feature: Feature) => {
        const entities = associations.get(feature.uuid)?.entities ?? [];
        return (
          <div>
            {entities.slice(0, 2).map((entity) => (
              <EuiButtonEmpty
                key={entity.id}
                size="xs"
                flush="left"
                onClick={() => onSelectService(entity.id)}
                data-test-subj="knowledgeCatalogService"
                css={css`
                  display: flex;
                  text-align: left;
                  height: auto;
                  min-height: 24px;
                `}
              >
                {entity.label}
              </EuiButtonEmpty>
            ))}
            {entities.length > 2 && (
              <EuiToolTip
                content={entities
                  .slice(2)
                  .map((entity) => entity.label)
                  .join(' · ')}
              >
                <span
                  tabIndex={0}
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                    font-size: ${euiTheme.font.scale.xs}rem;
                  `}
                >
                  +{entities.length - 2}
                </span>
              </EuiToolTip>
            )}
            {!entities.length && (
              <EuiText size="xs" color="subdued">
                —
              </EuiText>
            )}
          </div>
        );
      },
    },
    {
      name: copy.usage,
      width: '90px',
      render: (feature: Feature) => {
        const count = associations.get(feature.uuid)?.rules.size ?? 0;
        return (
          <EuiText size="xs" color={count ? 'default' : 'subdued'}>
            {count
              ? i18n.translate('xpack.significantEventsApp.knowledgeCatalog.ruleCount', {
                  defaultMessage: '{count, plural, one {# rule} other {# rules}}',
                  values: { count },
                })
              : '—'}
          </EuiText>
        );
      },
    },
    {
      name: copy.confidence,
      width: '100px',
      align: 'right',
      render: (feature: Feature) => {
        const expired = Boolean(feature.expires_at && Date.parse(feature.expires_at) <= Date.now());
        return feature.excluded || expired ? (
          <EuiBadge color={feature.excluded ? 'default' : 'warning'}>
            {feature.excluded
              ? journey.excluded
              : i18n.translate('xpack.significantEventsApp.knowledgeCatalog.expired', {
                  defaultMessage: 'Expired',
                })}
          </EuiBadge>
        ) : (
          <EuiToolTip content={copy.confidenceHint}>
            <span
              tabIndex={0}
              css={css`
                font-size: ${euiTheme.font.scale.xs}rem;
                font-variant-numeric: tabular-nums;
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              {feature.confidence}%
            </span>
          </EuiToolTip>
        );
      },
    },
  ];
  return (
    <div data-test-subj="detectionKnowledgeBrowser">
      <EuiTabs size="s">
        {categories.map((item) => (
          <EuiTab
            key={item.id}
            isSelected={category === item.id}
            onClick={() => {
              setCategory(item.id);
              setLimit(36);
            }}
          >
            {item.label}{' '}
            <span
              css={css`
                font-size: ${euiTheme.font.scale.xs}rem;
                color: ${euiTheme.colors.textSubdued};
                margin-left: ${euiTheme.size.xs};
              `}
            >
              {
                eligible.filter((feature) => item.id === 'all' || categoryOf(feature) === item.id)
                  .length
              }
            </span>
          </EuiTab>
        ))}
      </EuiTabs>
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
          <EuiPopover
            aria-label={copy.filters}
            isOpen={filtersOpen}
            closePopover={() => setFiltersOpen(false)}
            anchorPosition="downRight"
            button={
              <EuiButtonEmpty
                size="s"
                iconType="filter"
                onClick={() => setFiltersOpen(!filtersOpen)}
                data-test-subj="knowledgeCatalogFilters"
              >
                {copy.filters}
                {showExpired || showExcluded
                  ? ` · ${Number(showExpired) + Number(showExcluded)}`
                  : ''}
              </EuiButtonEmpty>
            }
          >
            <EuiSwitch
              compressed
              label={copy.expired}
              checked={showExpired}
              onChange={(event) => {
                setShowExpired(event.target.checked);
                setLimit(36);
              }}
            />
            <EuiSpacer size="s" />
            <EuiSwitch
              compressed
              label={journey.showExcluded}
              checked={showExcluded}
              onChange={(event) => {
                setShowExcluded(event.target.checked);
                setLimit(36);
              }}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="none">
        <EuiBasicTable
          items={visible.slice(0, limit)}
          itemId="uuid"
          columns={columns}
          tableCaption={journey.knowledge}
          noItemsMessage={
            <EuiEmptyPrompt
              iconType="documents"
              titleSize="xs"
              title={<h3>{journey.emptyKnowledge}</h3>}
            />
          }
          data-test-subj="knowledgeCatalogTable"
        />
      </EuiPanel>
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
