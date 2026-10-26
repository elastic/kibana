/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { parseIocCategoryRows } from './parse_iocs';
import type { IocCategoryRow } from './parse_iocs';
import { copyValueAriaLabel } from './translations';
import type { InvestigationIoc } from './types';

export const INVESTIGATION_IOCS_ATTACHMENT_TEST_ID =
  'securitySolutionAgentBuilderInvestigationIocsAttachment';

const TYPE_COLUMN = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.typeColumn',
  { defaultMessage: 'IOC type' }
);
const VALUE_COLUMN = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.valueColumn',
  { defaultMessage: 'Indicators' }
);
const COPY_TOOLTIP = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.copyTooltip',
  { defaultMessage: 'Copy indicator' }
);

// The chat column is a flex item. Without a shrinkable min size, a nowrap badge's
// min-content width becomes the table's width and the row paints past the chat.
const containedCss = css`
  width: 100%;
  max-width: 100%;
  min-width: 0;
`;

// Let a badge shrink to the value column. `min-width: 0` is what allows that;
// the default min size is the full unwrapped indicator.
const shrinkableCss = css`
  max-width: 100%;
  min-width: 0;
`;

// Same truncation the flyout uses so the badge keeps its own type size and stops at the chat edge.
const valueLimitCss = css`
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
`;

// A tooltip has no ellipsis, so an unbroken hash or path must wrap to stay inside it.
const breakAnywhereCss = css`
  overflow-wrap: anywhere;
`;

const TABLE_CAPTION = i18n.translate(
  'xpack.securitySolution.agentBuilder.investigationIocs.tableCaption',
  { defaultMessage: 'Indicators of compromise by type' }
);

// The badge truncates, so the tooltip always carries the full value; the comment follows it.
const IocTooltipContent: React.FC<{ item: InvestigationIoc }> = ({ item }) => (
  <>
    <div css={breakAnywhereCss}>{item.value}</div>
    {item.comment ? <div>{item.comment}</div> : null}
  </>
);

// The copy control sits beside the badge rather than inside it. A clickable EuiBadge
// becomes a button whose intrinsic width is the full unwrapped indicator, which
// defeats the truncation below and pushes the row past the chat.
const IocBadges: React.FC<{ items: InvestigationIoc[] }> = ({ items }) => (
  <EuiFlexGroup gutterSize="s" wrap responsive={false} css={containedCss}>
    {items.map((item, index) => (
      <EuiFlexItem key={`${item.value}-${index}`} grow={false} css={shrinkableCss}>
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          wrap={false}
          responsive={false}
          css={shrinkableCss}
        >
          <EuiFlexItem grow={false} css={shrinkableCss}>
            <EuiToolTip
              content={<IocTooltipContent item={item} />}
              position="top"
              anchorProps={{ css: shrinkableCss }}
            >
              <span tabIndex={0} css={valueLimitCss}>
                <EuiBadge
                  color="hollow"
                  css={shrinkableCss}
                  data-test-subj={`investigationIocBadge-${index}`}
                >
                  <span css={valueLimitCss}>{item.value}</span>
                </EuiBadge>
              </span>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={item.value}>
              {(copy) => (
                <EuiToolTip content={COPY_TOOLTIP} position="top">
                  <EuiButtonIcon
                    iconType="copy"
                    size="xs"
                    color="text"
                    onClick={copy}
                    aria-label={copyValueAriaLabel(item.value)}
                    data-test-subj={`investigationIocCopy-${index}`}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

/** Indicator and type counts, so a collapsed table still says how much was extracted. */
const IocsSummary: React.FC<{ rows: IocCategoryRow[] }> = ({ rows }) => {
  const { euiTheme } = useEuiTheme();
  const summaryCss = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;
  const indicatorCount = rows.reduce((total, row) => total + row.items.length, 0);
  return (
    <EuiText size="s" css={summaryCss} data-test-subj="investigationIocsSummary">
      <FormattedMessage
        id="xpack.securitySolution.agentBuilder.investigationIocs.summary"
        defaultMessage="Indicators of compromise: {indicatorCount, plural, one {# indicator} other {# indicators}} across {typeCount, plural, one {# type} other {# types}}"
        values={{ indicatorCount, typeCount: rows.length }}
      />
    </EuiText>
  );
};

/**
 * Category table for a `security.investigation.iocs` attachment: one row per filled category,
 * with each indicator as a badge and its comment in a tooltip.
 */
export const InvestigationIocsInlineContent: React.FC<
  AttachmentRenderProps<Attachment<string, unknown>>
> = ({ attachment }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationIocs' });
  const rows = useMemo(() => parseIocCategoryRows(attachment.data), [attachment.data]);

  const columns = useMemo<Array<EuiBasicTableColumn<IocCategoryRow>>>(
    () => [
      {
        field: 'typeLabel',
        name: TYPE_COLUMN,
        width: '14em',
        render: (typeLabel: string) => <EuiText size="s">{typeLabel}</EuiText>,
      },
      {
        field: 'items',
        name: VALUE_COLUMN,
        render: (items: InvestigationIoc[]) => <IocBadges items={items} />,
      },
    ],
    []
  );

  if (rows.length === 0) {
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="m"
        data-test-subj={INVESTIGATION_IOCS_ATTACHMENT_TEST_ID}
      >
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.agentBuilder.investigationIocs.empty"
            defaultMessage="No indicators were extracted from the available telemetry."
          />
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="s"
      css={containedCss}
      data-test-subj={INVESTIGATION_IOCS_ATTACHMENT_TEST_ID}
    >
      <EuiAccordion
        id={accordionId}
        buttonContent={<IocsSummary rows={rows} />}
        buttonProps={{ 'data-test-subj': 'investigationIocsToggle' }}
        paddingSize="none"
        data-test-subj="investigationIocsAccordion"
      >
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={TABLE_CAPTION}
          items={rows}
          columns={columns}
          itemId="id"
          // Fixed layout keeps the table at the chat width. Auto layout sizes the
          // value column to the longest indicator and the row overruns the chat.
          tableLayout="fixed"
          css={containedCss}
          responsiveBreakpoint={false}
        />
      </EuiAccordion>
    </EuiPanel>
  );
};
