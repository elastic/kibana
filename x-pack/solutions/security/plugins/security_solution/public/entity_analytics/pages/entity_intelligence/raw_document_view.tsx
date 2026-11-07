/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiIcon,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { getAlertSeverityColor } from './common';
import { buildPlainSummary, extractRawDocument } from './raw_document';
import type { RawField } from './raw_document';

const SECTION_ICON: Record<string, string> = {
  event: 'analyzeEvent',
  host: 'compute',
  user: 'user',
  source: 'sortUp',
  destination: 'sortDown',
  process: 'commandLine',
  file: 'document',
};

/** Optional plain-language help shown as an info tooltip on a section header. */
const SECTION_HELP: Record<string, string> = {
  event: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawHelpEvent',
    { defaultMessage: 'What kind of activity this record describes and how it was categorized.' }
  ),
  destination: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawHelpDestination',
    { defaultMessage: 'The remote address or domain this activity communicated with.' }
  ),
  process: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawHelpProcess',
    { defaultMessage: 'The program that ran, its command line, and the process that started it.' }
  ),
};

const MITRE_HELP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawHelpMitre',
  {
    defaultMessage:
      'MITRE ATT&CK is a knowledge base of adversary tactics (the goal) and techniques (the how). Txxxx codes identify a specific technique.',
  }
);

const RISK_HELP = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawHelpRisk',
  {
    defaultMessage:
      'Risk score (0–100) reflects how much this detection contributes to the overall risk of the entity.',
  }
);

interface RawDocumentViewProps {
  source: unknown;
  /** Larger `overflowHeight` for the JSON block when the panel is expanded. */
  expanded?: boolean;
}

const fieldsToList = (fields: readonly RawField[]): EuiDescriptionListProps['listItems'] =>
  fields.map((entry) => ({ title: entry.label, description: entry.value }));

/**
 * Beautiful, human-readable render of a raw alert / event `_source`. Opens with
 * a plain-language one-line summary of what the record IS, then surfaces the
 * headline (primary) fields per titled section with icons + help tooltips, with
 * verbose fields (hashes, PIDs, dataset, OS) tucked behind a "Details"
 * disclosure. Severity/risk render as colored badges, timestamps as absolute +
 * relative, MITRE as "Txxxx · Name" chips. A "View JSON" disclosure keeps the
 * full raw document. Pure extraction/summary live in `raw_document.ts`.
 */
export const RawDocumentView: React.FC<RawDocumentViewProps> = ({ source, expanded = false }) => {
  const { euiTheme } = useEuiTheme();
  const [showJson, setShowJson] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const model = useMemo(() => extractRawDocument(source), [source]);
  const summary = useMemo(() => (model ? buildPlainSummary(model) : undefined), [model]);

  if (!model) {
    return (
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawViewUnavailable',
            { defaultMessage: 'This document has no readable fields.' }
          )}
        </p>
      </EuiText>
    );
  }

  const sectionStyle = css`
    margin-top: ${euiTheme.size.s};
  `;
  const sectionHeaderStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    margin-bottom: ${euiTheme.size.xs};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${euiTheme.colors.textSubdued};
  `;

  const renderFieldList = (id: string, fields: readonly RawField[]) => (
    <EuiDescriptionList
      type="column"
      compressed
      columnWidths={[1, 2]}
      listItems={fieldsToList(fields)}
      data-test-subj={`rawViewFields-${id}`}
    />
  );

  const renderSection = (id: string, title: string, fields: readonly RawField[]) => {
    const primary = fields.filter((entry) => entry.group === 'primary');
    if (primary.length === 0) return null;
    const help = SECTION_HELP[id];
    return (
      <div css={sectionStyle} key={id} data-test-subj={`rawViewSection-${id}`}>
        <div css={sectionHeaderStyle}>
          <EuiIcon type={SECTION_ICON[id] ?? 'dot'} size="s" aria-hidden={true} />
          {title}
          {help ? <EuiIconTip type="question" content={help} size="s" /> : null}
        </div>
        {renderFieldList(id, primary)}
      </div>
    );
  };

  const detailFields = [
    ...model.event,
    ...model.host,
    ...model.user,
    ...model.process,
    ...model.file,
  ].filter((entry) => entry.group === 'detail');

  const accent = model.severity
    ? getAlertSeverityColor(euiTheme, model.severity)
    : euiTheme.colors.borderBasePlain;

  return (
    <div data-test-subj="entityIntelligenceRawView">
      {/* Plain-language, one-line description of what this record is. */}
      {summary ? (
        <div
          css={css`
            display: flex;
            gap: ${euiTheme.size.s};
            padding: ${euiTheme.size.s};
            border-left: ${euiTheme.border.width.thick} solid ${accent};
            border-radius: ${euiTheme.border.radius.small};
            background: ${transparentize(accent, 0.08)};
          `}
          data-test-subj="entityIntelligenceRawSummary"
        >
          <EuiIcon
            type={model.kind === 'alert' ? 'warning' : 'analyzeEvent'}
            size="m"
            aria-hidden={true}
          />
          <EuiText size="s">
            <span>{summary}</span>
          </EuiText>
        </div>
      ) : null}

      {/* Headline badges: kind, severity, risk score, timestamp. */}
      <EuiSpacer size="s" />
      <div
        css={css`
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: ${euiTheme.size.xs};
        `}
      >
        <EuiBadge color={model.kind === 'alert' ? 'hollow' : 'default'}>
          {model.kind === 'alert'
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawViewKindAlert',
                { defaultMessage: 'Alert' }
              )
            : i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawViewKindEvent',
                { defaultMessage: 'Event' }
              )}
        </EuiBadge>
        {model.severity ? (
          <EuiBadge color={getAlertSeverityColor(euiTheme, model.severity)}>
            {model.severity}
          </EuiBadge>
        ) : null}
        {model.riskScore !== undefined ? (
          <EuiBadge color="default">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawViewRiskScore',
              { defaultMessage: 'Risk {score}', values: { score: model.riskScore } }
            )}
          </EuiBadge>
        ) : null}
        {model.riskScore !== undefined ? (
          <EuiIconTip type="question" content={RISK_HELP} size="s" position="top" />
        ) : null}
        {model.timestamp ? (
          <span
            css={css`
              margin-left: auto;
              font-size: 11px;
              color: ${euiTheme.colors.textSubdued};
              font-variant-numeric: tabular-nums;
            `}
          >
            <PreferenceFormattedDate value={new Date(model.timestamp)} />
            {' · '}
            <FormattedRelative value={new Date(model.timestamp)} />
          </span>
        ) : null}
      </div>

      {model.reason ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <span
              css={css`
                overflow-wrap: anywhere;
              `}
            >
              {model.reason}
            </span>
          </EuiText>
        </>
      ) : null}

      {renderSection(
        'process',
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSectionProcess',
          { defaultMessage: 'Process' }
        ),
        model.process
      )}
      {renderSection(
        'destination',
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSectionDestination',
          { defaultMessage: 'Destination' }
        ),
        model.destination
      )}
      {renderSection(
        'source',
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSectionSource',
          { defaultMessage: 'Source' }
        ),
        model.source
      )}
      {renderSection(
        'file',
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSectionFile',
          {
            defaultMessage: 'File',
          }
        ),
        model.file
      )}
      {renderSection(
        'host',
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSectionHost',
          {
            defaultMessage: 'Host',
          }
        ),
        model.host
      )}
      {renderSection(
        'user',
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSectionUser',
          {
            defaultMessage: 'User',
          }
        ),
        model.user
      )}
      {renderSection(
        'event',
        i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSectionEvent',
          {
            defaultMessage: 'Event',
          }
        ),
        model.event
      )}

      {model.threats.length > 0 ? (
        <div css={sectionStyle} data-test-subj="rawViewSection-threat">
          <div css={sectionHeaderStyle}>
            <EuiIcon type="bug" size="s" aria-hidden={true} />
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawSectionThreat',
              { defaultMessage: 'MITRE ATT&CK' }
            )}
            <EuiIconTip type="question" content={MITRE_HELP} size="s" />
          </div>
          <div
            css={css`
              display: flex;
              flex-direction: column;
              gap: ${euiTheme.size.xs};
            `}
          >
            {model.threats.map((threat, index) => (
              <div key={`${threat.tacticId ?? 'tactic'}-${index}`}>
                {threat.tacticName ? (
                  <EuiText size="xs">
                    <strong>{threat.tacticName}</strong>
                    {threat.tacticId ? ` (${threat.tacticId})` : ''}
                  </EuiText>
                ) : null}
                <div
                  css={css`
                    display: flex;
                    flex-wrap: wrap;
                    gap: ${euiTheme.size.xs};
                    margin-top: 2px;
                  `}
                >
                  {threat.techniques.map((technique) => (
                    <EuiBadge key={`${technique.id}-${technique.name}`} color="hollow">
                      {[technique.id, technique.name].filter(Boolean).join(' · ')}
                    </EuiBadge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {detailFields.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="xs"
            iconType={showDetails ? 'chevronSingleDown' : 'chevronSingleRight'}
            onClick={() => setShowDetails((current) => !current)}
            data-test-subj="entityIntelligenceRawViewDetailsToggle"
          >
            {showDetails
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawViewHideDetails',
                  { defaultMessage: 'Hide technical details' }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawViewShowDetails',
                  { defaultMessage: 'Show technical details' }
                )}
          </EuiButtonEmpty>
          {showDetails ? (
            <div css={sectionStyle} data-test-subj="rawViewSection-details">
              {renderFieldList('details', detailFields)}
            </div>
          ) : null}
        </>
      ) : null}

      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="xs"
        iconType={showJson ? 'chevronSingleDown' : 'chevronSingleRight'}
        onClick={() => setShowJson((current) => !current)}
        data-test-subj="entityIntelligenceRawViewJsonToggle"
      >
        {showJson
          ? i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawViewHideJson',
              { defaultMessage: 'Hide JSON' }
            )
          : i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.explorer.rawViewShowJson',
              { defaultMessage: 'View JSON' }
            )}
      </EuiButtonEmpty>
      {showJson ? (
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="s"
          isCopyable
          overflowHeight={expanded ? 420 : 260}
        >
          {JSON.stringify(source, null, 2)}
        </EuiCodeBlock>
      ) : null}
    </div>
  );
};
