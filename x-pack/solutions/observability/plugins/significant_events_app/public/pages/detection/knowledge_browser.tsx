/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
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
  EuiSelect,
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
import { journey } from './journey_translations';
import {
  filterKnowledge,
  knowledgeCategory,
  type KnowledgeFilters,
  type KnowledgeAssociation,
} from '../knowledge/knowledge_model';
import { knowledgeLabels } from '../knowledge/translations';

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
  visibleFeatures,
  associations,
  filters,
  onFiltersChange,
  onReset,
  graph,
  onInspect,
  onSelectService,
  onHighlight,
}: {
  features: Feature[];
  visibleFeatures: Feature[];
  associations: Map<string, KnowledgeAssociation>;
  filters: KnowledgeFilters;
  onFiltersChange: (changes: Partial<KnowledgeFilters>) => void;
  onReset: () => void;
  graph?: React.ReactNode;
  onInspect: (feature: Feature) => void;
  onSelectService: (id: string) => void;
  onHighlight: (id?: string) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(36);
  const categories: Array<{ id: KnowledgeFilters['category']; label: string; icon: string }> = [
    { id: 'all', label: journey.allKnowledge, icon: 'documents' },
    { id: 'services', label: journey.services, icon: 'apps' },
    { id: 'technologies', label: journey.technologies, icon: 'wrench' },
    { id: 'dependencies', label: journey.dependencies, icon: 'graphApp' },
    { id: 'infrastructure', label: journey.infrastructure, icon: 'database' },
    { id: 'patterns', label: journey.patterns, icon: 'visLine' },
  ];
  const change = (changes: Partial<KnowledgeFilters>): void => {
    setLimit(36);
    onFiltersChange(changes);
  };
  const eligible = filterKnowledge(
    features,
    { ...filters, category: 'all', usage: 'all' },
    associations,
    Date.now()
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
              type={
                categories.find((item) => item.id === knowledgeCategory(feature))?.icon ||
                'documents'
              }
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
        const count = associations.get(feature.uuid)?.queries.length ?? 0;
        return (
          <EuiText size="xs" color={count ? 'default' : 'subdued'}>
            {count
              ? i18n.translate('xpack.significantEventsApp.knowledgeCatalog.queryCount', {
                  defaultMessage: '{count, plural, one {# query} other {# queries}}',
                  values: { count },
                })
              : knowledgeLabels.missingQueries}
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
      {graph && (
        <>
          {graph}
          <EuiSpacer size="l" />
        </>
      )}
      <EuiTabs size="s" expand={false}>
        {categories.map((item) => (
          <EuiTab
            key={item.id}
            isSelected={filters.category === item.id}
            onClick={() => change({ category: item.id })}
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
                eligible.filter(
                  (feature) => item.id === 'all' || knowledgeCategory(feature) === item.id
                ).length
              }
            </span>
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem
          css={css`
            min-width: 220px;
          `}
        >
          <EuiFieldSearch
            data-test-subj="significantEventsAppKnowledgeBrowserFieldSearch"
            compressed
            fullWidth
            value={filters.search}
            onChange={(event) => change({ search: event.target.value })}
            placeholder={journey.searchKnowledge}
            aria-label={journey.searchKnowledge}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            aria-label={knowledgeLabels.anyConfidence}
            value={filters.confidence}
            onChange={(event) =>
              change({
                confidence:
                  event.target.value === 'high'
                    ? 'high'
                    : event.target.value === 'review'
                    ? 'review'
                    : 'all',
              })
            }
            options={[
              { value: 'all', text: knowledgeLabels.anyConfidence },
              { value: 'high', text: knowledgeLabels.highConfidence },
              { value: 'review', text: knowledgeLabels.reviewConfidence },
            ]}
            data-test-subj="knowledgeConfidenceFilter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            aria-label={knowledgeLabels.anyAge}
            value={filters.freshness}
            onChange={(event) =>
              change({ freshness: event.target.value === 'recent' ? 'recent' : 'all' })
            }
            options={[
              { value: 'all', text: knowledgeLabels.anyAge },
              { value: 'recent', text: knowledgeLabels.recent },
            ]}
            data-test-subj="knowledgeFreshnessFilter"
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
                {filters.showExpired || filters.showExcluded
                  ? ` · ${Number(filters.showExpired) + Number(filters.showExcluded)}`
                  : ''}
              </EuiButtonEmpty>
            }
          >
            <EuiSwitch
              compressed
              label={copy.expired}
              checked={filters.showExpired}
              onChange={(event) => change({ showExpired: event.target.checked })}
            />
            <EuiSpacer size="s" />
            <EuiSwitch
              compressed
              label={journey.showExcluded}
              checked={filters.showExcluded}
              onChange={(event) => change({ showExcluded: event.target.checked })}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        {(
          [
            { id: 'all', label: knowledgeLabels.allQueries },
            { id: 'missing_queries', label: knowledgeLabels.missingQueries },
            { id: 'with_queries', label: knowledgeLabels.withQueries },
          ] as const
        ).map((item) => (
          <EuiFlexItem key={item.id} grow={false}>
            <EuiToolTip
              content={item.id === 'missing_queries' ? knowledgeLabels.missingHint : item.label}
            >
              <EuiButtonEmpty
                size="xs"
                iconType={
                  item.id === 'missing_queries'
                    ? 'search'
                    : item.id === 'with_queries'
                    ? 'visLine'
                    : 'documents'
                }
                aria-pressed={filters.usage === item.id}
                onClick={() => change({ usage: item.id })}
                data-test-subj={`knowledgeUsageFilter-${item.id}`}
                css={css`
                  border-radius: ${euiTheme.border.radius.medium};
                  background: ${filters.usage === item.id
                    ? `color-mix(in srgb, ${euiTheme.colors.primary} 12%, transparent)`
                    : 'transparent'};
                `}
              >
                {item.label} ·{' '}
                {
                  eligible.filter(
                    (feature) =>
                      (filters.category === 'all' ||
                        knowledgeCategory(feature) === filters.category) &&
                      (item.id === 'all' ||
                        (item.id === 'missing_queries'
                          ? !associations.get(feature.uuid)?.queries.length
                          : Boolean(associations.get(feature.uuid)?.queries.length)))
                  ).length
                }
              </EuiButtonEmpty>
            </EuiToolTip>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{knowledgeLabels.matches}</strong>{' '}
            <EuiBadge color="hollow">{visibleFeatures.length}</EuiBadge>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="significantEventsAppKnowledgeBrowserButton"
            size="xs"
            iconType="cross"
            onClick={onReset}
          >
            {knowledgeLabels.reset}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="none">
        <EuiBasicTable
          items={visibleFeatures.slice(0, limit)}
          rowProps={(feature) => ({
            onMouseEnter: () => onHighlight(feature.uuid),
            onMouseLeave: () => onHighlight(undefined),
            onFocus: () => onHighlight(feature.uuid),
            onBlur: () => onHighlight(undefined),
          })}
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
      {visibleFeatures.length > limit && (
        <>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            data-test-subj="significantEventsAppKnowledgeBrowserButton"
            onClick={() => setLimit(limit + 36)}
          >
            {journey.browse} · {visibleFeatures.length - limit}
          </EuiButtonEmpty>
        </>
      )}
    </div>
  );
};
