/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiPanel,
  EuiToolTip,
  EuiText,
  EuiHorizontalRule,
  EuiLink,
  type EuiPanelProps,
} from '@elastic/eui';
import { Action } from '@kbn/ui-actions-plugin/public';
import { UserMessage } from '@kbn/lens-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { useLensAttributes, type UseLensAttributesParams } from '../../hooks/use_lens_attributes';
import type { BaseChartProps } from './types';
import type { TooltipContentProps } from './metric_explanation/tooltip_content';
import { LensWrapper } from './lens_wrapper';
import { ChartLoadError } from './chart_load_error';
import { HOST_MISSING_FIELDS } from '../../common/visualizations/constants';

const MIN_HEIGHT = 300;
const DEFAULT_DISABLED_ACTIONS = [
  'ACTION_CUSTOMIZE_PANEL',
  'ACTION_EXPORT_CSV',
  'embeddable_addToExistingCase',
  'create-ml-ad-job-action',
];

export type LensChartProps = BaseChartProps &
  Pick<EuiPanelProps, 'borderRadius'> & {
    toolTip?: React.ReactElement<TooltipContentProps>;
    searchSessionId?: string;
    description?: string;
  } & {
    lensAttributes: UseLensAttributesParams;
    withDefaultActions?: boolean;
    disabledActions?: string[];
  };

export const LensChart = React.memo(
  ({
    id,
    borderRadius,
    dateRange,
    filters,
    hidePanelTitles,
    query,
    onBrushEnd,
    onFilter,
    overrides,
    toolTip,
    searchSessionId,
    disableTriggers = false,
    height = MIN_HEIGHT,
    loading = false,
    lensAttributes,
    withDefaultActions = true,
    disabledActions = DEFAULT_DISABLED_ACTIONS,
  }: LensChartProps) => {
    const { formula, attributes, getExtraActions, error } = useLensAttributes(lensAttributes);

    const isLoading = loading || !attributes;

    const extraActions: Action[] = getExtraActions({
      timeRange: dateRange,
      query,
      filters,
      searchSessionId,
    });

    const handleBeforeBadgesRender = useCallback((messages: UserMessage[]) => {
      const missingFieldsMessage = messages.find(
        (m) => m.uniqueId === 'field_not_found' && m.severity === 'error'
      );
      return missingFieldsMessage
        ? [
            {
              ...missingFieldsMessage,
              severity: 'warning' as const,
              hidePopoverIcon: true,
              longMessage: (
                <>
                  <EuiText size="s">
                    <strong>
                      <FormattedMessage
                        id="xpack.infra.lens.customErrorHandler.title"
                        defaultMessage="No results found"
                      />
                    </strong>
                  </EuiText>
                  <EuiHorizontalRule margin="s" />
                  <EuiText size="xs" data-test-subj="infraLensCustomErrorHanlderText">
                    <p>
                      <FormattedMessage
                        id="xpack.infra.lens.customErrorHandler.description"
                        defaultMessage="To display this chart, please ensure you are collecting the following fields:"
                      />
                    </p>
                    <p>
                      {missingFieldsMessage &&
                        (missingFieldsMessage.longMessage as React.ReactNode)}
                    </p>
                  </EuiText>
                  <EuiHorizontalRule margin="s" />
                  <EuiLink
                    data-test-subj="infraLensCustomErrorHanlderLink"
                    href={HOST_MISSING_FIELDS}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.infra.customErrorHandler.learnMoreLink"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                </>
              ),
            },
          ]
        : messages;
    }, []);

    const lens = (
      <LensWrapper
        id={id}
        attributes={attributes}
        dateRange={dateRange}
        disableTriggers={disableTriggers}
        extraActions={extraActions}
        withDefaultActions={withDefaultActions}
        disabledActions={disabledActions}
        filters={filters}
        hidePanelTitles={hidePanelTitles}
        loading={isLoading}
        style={{ height }}
        query={query}
        overrides={overrides}
        onBrushEnd={onBrushEnd}
        searchSessionId={searchSessionId}
        onFilter={onFilter}
        onBeforeBadgesRender={handleBeforeBadgesRender}
      />
    );
    const content = !toolTip ? (
      lens
    ) : (
      <EuiToolTip
        delay="regular"
        content={React.cloneElement(toolTip, {
          formula,
        })}
        anchorClassName="eui-fullWidth"
      >
        {/* EuiToolTip forwards some event handlers to the child component.
        Wrapping Lens inside a div prevents that from causing unnecessary re-renders  */}
        <div>{lens}</div>
      </EuiToolTip>
    );

    return (
      <EuiPanel
        hasBorder={!!borderRadius}
        borderRadius={borderRadius}
        hasShadow={false}
        paddingSize={error ? 'm' : 'none'}
        data-test-subj={id}
        css={css`
          position: relative;
          min-height: ${height}px;
          .embPanel-isLoading {
            min-height: ${height}px;
          }
        `}
      >
        {error ? <ChartLoadError error={error} /> : content}
      </EuiPanel>
    );
  }
);
