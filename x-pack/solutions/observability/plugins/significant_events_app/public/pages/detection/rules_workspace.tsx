/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiButtonIcon,
  euiPaletteColorBlind,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { QueryWithOccurrences } from '@kbn/significant-events-schema';
import { useKibana } from '../../hooks/use_kibana';
import { SparkPlot } from '../../components/spark_plot';
import type { DetectionEntity } from './model';
import { labels } from './translations';

const copy = {
  scope: i18n.translate('xpack.significantEventsApp.rulesWorkspace.scope', {
    defaultMessage: 'Showing rules for',
  }),
  activity: i18n.translate('xpack.significantEventsApp.rulesWorkspace.activity', {
    defaultMessage: 'Rule matches over time',
  }),
  description: i18n.translate('xpack.significantEventsApp.rulesWorkspace.description', {
    defaultMessage: 'Matched log documents in the selected time range, grouped by rule.',
  }),
  noRules: i18n.translate('xpack.significantEventsApp.rulesWorkspace.noRules', {
    defaultMessage: 'No rules for this service yet',
  }),
  unassigned: i18n.translate('xpack.significantEventsApp.rulesWorkspace.unassigned', {
    defaultMessage: 'Rules without a service association',
  }),
};
const matches = (query: QueryWithOccurrences): number =>
  query.occurrences.reduce((sum, bucket) => sum + bucket.count, 0);
const ruleKey = (query: QueryWithOccurrences): string => `${query.stream_name}:${query.id}`;
const uniqueRules = (queries: QueryWithOccurrences[]): QueryWithOccurrences[] => [
  ...new Map(queries.map((query) => [ruleKey(query), query])).values(),
];
const rulesLabel = (count: number): string =>
  i18n.translate('xpack.significantEventsApp.rulesWorkspace.rulesCount', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}}',
    values: { count },
  });
const matchesLabel = (count: number): string =>
  i18n.translate('xpack.significantEventsApp.rulesWorkspace.matchesCount', {
    defaultMessage: '{count, plural, one {# match} other {# matches}}',
    values: { count },
  });

const RuleActivityChart = ({
  queries,
  start,
  end,
  compact = false,
}: {
  queries: QueryWithOccurrences[];
  start: number;
  end: number;
  compact?: boolean;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { dependencies } = useKibana();
  const baseTheme = dependencies.start.charts.theme.useChartsBaseTheme();
  const data = useMemo(
    () =>
      uniqueRules(queries).flatMap((rule) =>
        rule.occurrences.map((bucket) => ({
          x: Date.parse(bucket.date),
          y: bucket.count,
          rule: ruleKey(rule),
        }))
      ),
    [queries]
  );
  const names = new Map(queries.map((rule) => [ruleKey(rule), rule.title]));
  const id = useGeneratedHtmlId({ prefix: 'ruleActivityChart' });
  if (!queries.length || !data.length)
    return (
      <EuiText size="xs" color="subdued">
        <p>{queries.length ? labels.noData : copy.noRules}</p>
      </EuiText>
    );
  return (
    <Chart size={{ width: '100%', height: compact ? 48 : 210 }}>
      <Settings
        baseTheme={dependencies.start.charts.theme.chartsDefaultBaseTheme}
        theme={[
          baseTheme,
          {
            background: { color: 'transparent' },
            colors: { vizColors: euiPaletteColorBlind(10) },
            chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
            areaSeriesStyle: {
              area: { opacity: compact ? 0.2 : 0.32 },
              point: { opacity: 0 },
              line: { strokeWidth: 1.5 },
            },
            lineSeriesStyle: { point: { opacity: 0 } },
          },
        ]}
        locale={i18n.getLocale()}
        showLegend={false}
        xDomain={{ min: start, max: end }}
      />
      <Tooltip
        headerFormatter={(value) => new Date(Number(value.value)).toLocaleString(i18n.getLocale())}
      />
      <Axis
        id={`${id}-time`}
        position="bottom"
        hide={compact}
        tickFormat={niceTimeFormatter([start, end])}
        showOverlappingLabels={false}
        showOverlappingTicks={false}
      />
      <Axis
        id={`${id}-matches`}
        position="left"
        hide={compact}
        tickFormat={(value) => Number(value).toLocaleString(i18n.getLocale())}
        domain={{ min: 0 }}
      />
      <AreaSeries
        id={id}
        name={(series) =>
          names.get(String(series.splitAccessors.get('rule'))) ||
          String(series.splitAccessors.get('rule'))
        }
        data={data}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="x"
        yAccessors={['y']}
        splitSeriesAccessors={['rule']}
        stackAccessors={['x']}
        curve={CurveType.CURVE_MONOTONE_X}
        color={compact && queries.length === 1 ? euiTheme.colors.primary : undefined}
      />
    </Chart>
  );
};

const RuleList = ({
  queries,
  onInspect,
}: {
  queries: QueryWithOccurrences[];
  onInspect: (query: QueryWithOccurrences) => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const [limit, setLimit] = useState(30);
  const sorted = [...uniqueRules(queries)].sort((a, b) => matches(b) - matches(a));
  return (
    <div>
      {sorted.slice(0, limit).map((rule) => (
        <button
          key={ruleKey(rule)}
          type="button"
          onClick={() => onInspect(rule)}
          data-test-subj="detectionRulesWorkspaceRule"
          css={css`
            display: grid;
            grid-template-columns: minmax(0, 1fr) 110px 100px;
            width: 100%;
            gap: ${euiTheme.size.m};
            align-items: center;
            text-align: left;
            color: ${euiTheme.colors.text};
            padding: ${euiTheme.size.m} ${euiTheme.size.s};
            border-top: 1px solid ${euiTheme.colors.borderBasePlain};
            &:hover {
              background: ${euiTheme.colors.backgroundBaseSubdued};
            }
            &:focus-visible {
              outline: 2px solid ${euiTheme.colors.primary};
            }
            @media (max-width: 700px) {
              grid-template-columns: minmax(0, 1fr) 100px;
            }
          `}
        >
          <span>
            <EuiText size="s">
              <strong>{rule.title}</strong>
            </EuiText>
            <EuiText size="xs" color="subdued">
              <span
                css={css`
                  display: -webkit-box;
                  -webkit-line-clamp: 1;
                  -webkit-box-orient: vertical;
                  overflow: hidden;
                `}
              >
                {rule.description}
              </span>
            </EuiText>
          </span>
          <span
            css={css`
              @media (max-width: 700px) {
                display: none;
              }
            `}
          >
            <SparkPlot
              id={ruleKey(rule)}
              name={rule.title}
              type="line"
              timeseries={rule.occurrences.map((bucket) => ({
                x: Date.parse(bucket.date),
                y: bucket.count,
              }))}
              annotations={[]}
              compressed
              hideAxis
              height={36}
            />
          </span>
          <span
            css={css`
              text-align: right;
            `}
          >
            <EuiBadge color="hollow">{rule.rule_backed ? labels.active : labels.draft}</EuiBadge>
            <EuiText size="xs" color="subdued">
              {matchesLabel(matches(rule))}
            </EuiText>
          </span>
        </button>
      ))}
      {sorted.length > limit && (
        <EuiButtonEmpty
          size="s"
          onClick={() => setLimit(limit + 30)}
          data-test-subj="detectionRulesWorkspaceMore"
        >
          {labels.showMore}
        </EuiButtonEmpty>
      )}
    </div>
  );
};

export const RulesWorkspace = ({
  entities,
  selected,
  queries,
  start,
  end,
  onInspect,
  onSelectService,
  allRulesHref,
  scopeLabel,
}: {
  entities: DetectionEntity[];
  selected?: DetectionEntity;
  scopeLabel?: string;
  queries: QueryWithOccurrences[];
  start: number;
  end: number;
  onInspect: (query: QueryWithOccurrences) => void;
  onSelectService: (id: string) => void;
  allRulesHref: string;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const id = useGeneratedHtmlId({ prefix: 'serviceRules' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleGroup = (groupId: string, open: boolean): void =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (open) next.add(groupId);
      else next.delete(groupId);
      return next;
    });
  const scoped = uniqueRules(selected?.queries ?? queries);
  const assigned = new Set(entities.flatMap((entity) => entity.queries.map(ruleKey)));
  const unassigned = queries.filter((rule) => !assigned.has(ruleKey(rule)));
  const groups = entities
    .map((entity) => ({
      id: entity.id,
      label: entity.label,
      entity,
      queries: uniqueRules(entity.queries),
    }))
    .filter((group) => group.queries.length > 0);
  return (
    <div data-test-subj="detectionRulesWorkspace">
      <EuiPanel hasBorder hasShadow={false} paddingSize="l">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" wrap>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <p>
                {copy.scope}{' '}
                <strong
                  css={css`
                    color: ${euiTheme.colors.text};
                  `}
                >
                  {selected?.label || scopeLabel || labels.allServices}
                </strong>{' '}
                · {rulesLabel(scoped.length)}
              </p>
            </EuiText>
            {selected && (
              <EuiText size="xs" color="subdued">
                <EuiToolTip content={selected.streams.join(' · ')}>
                  <span tabIndex={0}>
                    {i18n.translate('xpack.significantEventsApp.rulesWorkspace.streamCount', {
                      defaultMessage: '{count, plural, one {# stream} other {# streams}}',
                      values: { count: selected.streams.length },
                    })}
                  </span>
                </EuiToolTip>
              </EuiText>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              href={allRulesHref}
              iconType="external"
              data-test-subj="detectionRulesWorkspaceManage"
            >
              {labels.allRules}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" wrap>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{copy.activity}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={copy.description} disableScreenReaderOutput>
                  <EuiButtonIcon
                    data-test-subj="significantEventsAppRulesWorkspaceButton"
                    iconType="iInCircle"
                    size="s"
                    aria-label={copy.description}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {matchesLabel(scoped.reduce((sum, rule) => sum + matches(rule), 0))}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <RuleActivityChart queries={scoped} start={start} end={end} />
      </EuiPanel>
      <EuiSpacer size="m" />
      {selected ? (
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          {scoped.length ? (
            <RuleList queries={scoped} onInspect={onInspect} />
          ) : (
            <EuiEmptyPrompt
              paddingSize="s"
              titleSize="xs"
              iconType="bolt"
              title={<h3>{copy.noRules}</h3>}
              body={<p>{labels.noRulesBody}</p>}
            />
          )}
        </EuiPanel>
      ) : (
        <>
          {groups.map((group) => (
            <EuiPanel
              key={group.id}
              hasBorder
              hasShadow={false}
              paddingSize="s"
              css={css`
                margin-bottom: ${euiTheme.size.s};
              `}
            >
              <div
                css={css`
                  display: grid;
                  grid-template-columns: minmax(220px, 0.6fr) minmax(0, 1fr);
                  gap: ${euiTheme.size.l};
                  align-items: center;
                  @media (max-width: 700px) {
                    grid-template-columns: minmax(0, 1fr);
                    gap: ${euiTheme.size.s};
                  }
                `}
              >
                <div
                  css={css`
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                  `}
                >
                  <EuiButtonEmpty
                    size="s"
                    flush="left"
                    iconType="apps"
                    onClick={() => onSelectService(group.id)}
                    data-test-subj="detectionRulesWorkspaceService"
                    css={css`
                      align-self: flex-start;
                      max-width: 100%;
                      text-align: left;
                    `}
                  >
                    {group.label}
                  </EuiButtonEmpty>
                  <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
                    <EuiFlexItem grow={false}>
                      {group.queries.length ? (
                        <EuiButtonEmpty
                          size="xs"
                          flush="left"
                          iconType={expanded.has(group.id) ? 'arrowDown' : 'arrowRight'}
                          aria-expanded={expanded.has(group.id)}
                          aria-controls={`${id}-${group.id}`}
                          onClick={() => toggleGroup(group.id, !expanded.has(group.id))}
                          data-test-subj="detectionRulesWorkspaceExpandService"
                        >
                          {rulesLabel(group.queries.length)}
                        </EuiButtonEmpty>
                      ) : (
                        <EuiText size="xs" color="subdued">
                          {rulesLabel(0)}
                        </EuiText>
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {matchesLabel(group.queries.reduce((sum, rule) => sum + matches(rule), 0))}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
                <div
                  css={css`
                    min-width: 0;
                  `}
                >
                  <RuleActivityChart queries={group.queries} start={start} end={end} compact />
                </div>
              </div>
              <div id={`${id}-${group.id}`}>
                {expanded.has(group.id) && (
                  <>
                    <EuiSpacer size="s" />
                    <RuleList queries={group.queries} onInspect={onInspect} />
                  </>
                )}
              </div>
            </EuiPanel>
          ))}
          {unassigned.length > 0 && (
            <EuiPanel hasBorder hasShadow={false} paddingSize="m">
              <EuiText size="s">
                <strong>{copy.unassigned}</strong>
              </EuiText>
              <RuleActivityChart queries={unassigned} start={start} end={end} compact />
              <EuiAccordion
                id={`${id}-unassigned`}
                buttonContent={rulesLabel(unassigned.length)}
                initialIsOpen={false}
                onToggle={(open) => toggleGroup('unassigned', open)}
                paddingSize="s"
              >
                {expanded.has('unassigned') && (
                  <RuleList queries={unassigned} onInspect={onInspect} />
                )}
              </EuiAccordion>
            </EuiPanel>
          )}
          {!groups.length && !unassigned.length && (
            <EuiEmptyPrompt
              titleSize="xs"
              title={<h3>{labels.noRules}</h3>}
              body={<p>{labels.noRulesBody}</p>}
            />
          )}
        </>
      )}
    </div>
  );
};
