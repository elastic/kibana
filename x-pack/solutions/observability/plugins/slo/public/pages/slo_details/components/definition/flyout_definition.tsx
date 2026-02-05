/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiDescriptionListProps, EuiIconTipProps } from '@elastic/eui';
import {
  EuiAccordion,
  euiContainerQuery,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { occurrencesBudgetingMethodSchema } from '@kbn/slo-schema';
import { css } from '@emotion/react';
import numeral from '@elastic/numeral';
import {
  BUDGETING_METHOD_OCCURRENCES,
  BUDGETING_METHOD_TIMESLICES,
  toDurationLabel,
  toIndicatorTypeLabel,
  toTimeWindowLabel,
} from '../../../../utils/slo/labels';
import { SloFlyoutPanel } from '../../shared_flyout/flyout_panel';
import { useKibana } from '../../../../hooks/use_kibana';
import type { SloDetailsDefinitionProps } from '.';
import { DESCRIPTION_LIST_ROW_WIDTH_BREAKPOINT } from '../../shared_flyout/constants';
import { DisplayQuery } from '../overview/display_query';

function AccordionHeader({ title }: { title: string }) {
  return (
    <EuiText size="s" component="span" css={{ fontWeight: 600 }}>
      {title}
    </EuiText>
  );
}

function DescriptionListTitle({
  title,
  tooltipContent,
}: {
  title: string;
  tooltipContent?: EuiIconTipProps['content'];
}) {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <p>{title}</p>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIconTip content={tooltipContent} size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function DescriptionListDescription({ description }: { description: string }) {
  return <EuiText size="s">{description}</EuiText>;
}

export function SloDetailsFlyoutDefinition({ slo }: SloDetailsDefinitionProps) {
  const definitionId = useGeneratedHtmlId();
  const descriptionId = useGeneratedHtmlId();

  const { euiTheme } = useEuiTheme();

  const { uiSettings } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const items: EuiDescriptionListProps['listItems'] = useMemo(
    () => [
      {
        title: (
          <DescriptionListTitle
            title={i18n.translate(
              'xpack.slo.flyoutDefinition.descriptionListTitle.indicatorTypeLabel',
              { defaultMessage: 'Indicator type' }
            )}
          />
        ),
        description: (
          <DescriptionListDescription description={toIndicatorTypeLabel(slo.indicator.type)} />
        ),
      },
      {
        title: (
          <DescriptionListTitle
            title={i18n.translate(
              'xpack.slo.flyoutDefinition.descriptionListTitle.timeWindowLabel',
              {
                defaultMessage: 'Time window',
              }
            )}
          />
        ),
        description: <DescriptionListDescription description={toTimeWindowLabel(slo.timeWindow)} />,
      },
      {
        title: (
          <DescriptionListTitle
            title={i18n.translate(
              'xpack.slo.flyoutDefinition.descriptionListTitle.budgetingMethodLabel',
              {
                defaultMessage: 'Budgeting method',
              }
            )}
          />
        ),
        description: occurrencesBudgetingMethodSchema.is(slo.budgetingMethod) ? (
          <DescriptionListDescription description={BUDGETING_METHOD_OCCURRENCES} />
        ) : (
          <DescriptionListDescription
            description={`${BUDGETING_METHOD_TIMESLICES} (${
              slo.indicator.type === 'sli.metric.timeslice'
                ? i18n.translate(
                    'xpack.slo.sloDetails.overview.timeslicesBudgetingMethodDetailsForTimesliceMetric',
                    {
                      defaultMessage: '{duration} slices',
                      values: {
                        duration: toDurationLabel(slo.objective.timesliceWindow!),
                      },
                    }
                  )
                : i18n.translate('xpack.slo.sloDetails.overview.timeslicesBudgetingMethodDetails', {
                    defaultMessage: '{duration} slices, {target} target',
                    values: {
                      duration: toDurationLabel(slo.objective.timesliceWindow!),
                      target: numeral(slo.objective.timesliceTarget!).format(percentFormat),
                    },
                  })
            })`}
          />
        ),
      },
      {
        title: (
          <DescriptionListTitle
            title={i18n.translate('xpack.slo.sloDetails.overview.settings.syncDelay', {
              defaultMessage: 'Sync delay',
            })}
          />
        ),
        description: (
          <DescriptionListDescription description={toDurationLabel(slo.settings.syncDelay)} />
        ),
      },
      {
        title: (
          <DescriptionListTitle
            title={i18n.translate('xpack.slo.sloDetails.overview.settings.frequency', {
              defaultMessage: 'Frequency',
            })}
          />
        ),
        description: (
          <DescriptionListDescription description={toDurationLabel(slo.settings.frequency)} />
        ),
      },
    ],
    [slo, percentFormat]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiAccordion
          id={definitionId}
          buttonContent={
            <AccordionHeader
              title={i18n.translate('xpack.slo.flyoutDefinition.accordionHeader.definitionLabel', {
                defaultMessage: 'Definition',
              })}
            />
          }
          initialIsOpen
        >
          <EuiSpacer />
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <SloFlyoutPanel
                title={i18n.translate('xpack.slo.flyoutDefinition.sloFlyoutCard.definitionLabel', {
                  defaultMessage: 'Definition',
                })}
              >
                <EuiDescriptionList
                  listItems={items}
                  type="column"
                  columnWidths={[1, 2]}
                  rowGutterSize="m"
                  css={css`
                    /* 
                    Responsive columns mode works with media queries but in this case the component is wrapped in a flyout
                    that can be resized independently from the viewport size, so we need to use container queries instead
                    which requires some custom CSS.
                    */
                    ${euiContainerQuery(`(width > ${DESCRIPTION_LIST_ROW_WIDTH_BREAKPOINT}px)`)} {
                      /* Remove column gap to ensure bottom border is perceived as a continuous line */
                      column-gap: 0px;
                      /* Ensure dt and dd have the same height to align the borders */
                      align-items: stretch;

                      dt:not(:last-of-type),
                      dd:not(:last-of-type) {
                        border-bottom: ${euiTheme.border.thin};
                        /* Space between content and border */
                        padding-bottom: ${euiTheme.size.s};
                      }
                    }

                    ${euiContainerQuery(`(width <= ${DESCRIPTION_LIST_ROW_WIDTH_BREAKPOINT}px)`)} {
                      /* Disable grid layout, essentially disabling column mode */
                      display: block;

                      dt:not(:first-of-type) {
                        /* Space between the border of the previous item and the title of the current one */
                        margin-block-start: ${euiTheme.size.m};
                      }

                      dd:not(:last-of-type) {
                        border-bottom: ${euiTheme.border.thin};
                        /* Space between content and border */
                        padding-bottom: ${euiTheme.size.s};
                      }
                    }
                  `}
                />
              </SloFlyoutPanel>
            </EuiFlexItem>
            {slo.indicator.params.filter && (
              <EuiFlexItem>
                <EuiPanel hasShadow={false} hasBorder>
                  <EuiFlexGroup direction="column" gutterSize="s">
                    <EuiFlexItem>
                      <EuiTitle size="xxs">
                        <p>
                          {i18n.translate('xpack.slo.flyoutDefinition.queryFilterLabel', {
                            defaultMessage: 'Query filter',
                          })}
                        </p>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <DisplayQuery
                        query={slo.indicator.params.filter}
                        index={'index' in slo.indicator.params ? slo.indicator.params.index : ''}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiAccordion>
      </EuiFlexItem>
      {slo.description !== '' && (
        <>
          <EuiFlexItem>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiAccordion
              id={descriptionId}
              buttonContent={
                <AccordionHeader
                  title={i18n.translate(
                    'xpack.slo.flyoutDefinition.accordionHeader.definitionLabel',
                    {
                      defaultMessage: 'Description',
                    }
                  )}
                />
              }
              initialIsOpen
            >
              <EuiSpacer />
              <SloFlyoutPanel
                title={i18n.translate('xpack.slo.flyoutDefinition.sloFlyoutCard.descriptionLabel', {
                  defaultMessage: 'Description',
                })}
              >
                <EuiText size="s">{slo.description}</EuiText>
              </SloFlyoutPanel>
            </EuiAccordion>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
}
