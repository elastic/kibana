/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiIcon,
  EuiText,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import type {
  SeverityMappingItem as SeverityMappingItemType,
  RiskScoreMappingItem as RiskScoreMappingItemType,
  Threats,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import { requiredOptional } from '@kbn/zod-helpers';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { SeverityBadge } from '../../../../common/components/severity_badge';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';
import { filterEmptyThreats } from '../../../rule_creation_ui/pages/rule_creation/helpers';
import { ThreatEuiFlexGroup } from '../../../rule_creation_ui/components/description_step/threat_description';

import { BadgeList } from './badge_list';
import { DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS } from './constants';
import * as i18n from './translations';

const OverrideColumn = styled(EuiFlexItem)`
  width: 125px;
  max-width: 125px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OverrideValueColumn = styled.div`
  width: 50px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const StyledEuiLink = styled(EuiLink)`
  word-break: break-word;
`;

interface NameProps {
  name: string;
}

const Name = ({ name }: NameProps) => <EuiText size="s">{name}</EuiText>;

interface DescriptionProps {
  description: string;
}

export const Description = ({ description }: DescriptionProps) => (
  <EuiText size="s">{description}</EuiText>
);

interface AuthorProps {
  author: string[];
}

export const Author = ({ author }: AuthorProps) => (
  <BadgeList badges={author} data-test-subj="authorPropertyValue" />
);

export const BuildingBlock = () => (
  <EuiText size="s" data-test-subj="buildingBlockPropertyValue">
    {i18n.BUILDING_BLOCK_FIELD_DESCRIPTION}
  </EuiText>
);

interface SeverityMappingItemProps {
  severityMappingItem: SeverityMappingItemType;
}

export const SeverityMappingItem = ({ severityMappingItem }: SeverityMappingItemProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <OverrideColumn>
      <EuiToolTip
        content={severityMappingItem.field}
        data-test-subj={`severityOverrideField-${severityMappingItem.value}`}
      >
        <span data-test-subj="severityOverrideField">{`${severityMappingItem.field}:`}</span>
      </EuiToolTip>
    </OverrideColumn>
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={severityMappingItem.value}
        data-test-subj={`severityOverrideValue-${severityMappingItem.value}`}
      >
        <OverrideValueColumn>
          <span data-test-subj="severityOverrideValue">
            {defaultToEmptyTag(severityMappingItem.value)}
          </span>
        </OverrideValueColumn>
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type={'sortRight'} />
    </EuiFlexItem>
    <EuiFlexItem>
      <SeverityBadge
        data-test-subj="severityOverrideSeverity"
        value={severityMappingItem.severity}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface RiskScoreProps {
  riskScore: number;
}

export const RiskScore = ({ riskScore }: RiskScoreProps) => (
  <EuiText size="s" data-test-subj="riskScorePropertyValue">
    {riskScore}
  </EuiText>
);

interface RiskScoreMappingItemProps {
  riskScoreMappingItem: RiskScoreMappingItemType;
}

export const RiskScoreMappingItem = ({ riskScoreMappingItem }: RiskScoreMappingItemProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <OverrideColumn>
      <EuiToolTip
        content={riskScoreMappingItem.field}
        data-test-subj={`riskScoreOverrideField-${riskScoreMappingItem.value}`}
      >
        <span data-test-subj="riskScoreOverridePropertyFieldName">
          {riskScoreMappingItem.field}
        </span>
      </EuiToolTip>
    </OverrideColumn>
    <EuiFlexItem grow={false}>
      <EuiIcon type={'sortRight'} />
    </EuiFlexItem>
    <EuiFlexItem data-test-subj="riskScoreOverridePropertyOverride">{ALERT_RISK_SCORE}</EuiFlexItem>
  </EuiFlexGroup>
);

interface ReferencesProps {
  references: string[];
}

export const References = ({ references }: ReferencesProps) => (
  <EuiText size="s">
    <ul>
      {references
        .filter((reference) => !isEmpty(reference))
        .map((reference, index) => (
          <li data-test-subj="urlsDescriptionReferenceLinkItem" key={`${index}-${reference}`}>
            <StyledEuiLink href={reference} external target="_blank">
              {reference}
            </StyledEuiLink>
          </li>
        ))}
    </ul>
  </EuiText>
);

export const FalsePositives = ({ falsePositives }: { falsePositives: string[] }) => (
  <EuiText size="s">
    <ul>
      {falsePositives.map((falsePositivesItem) => (
        <li
          data-test-subj="falsePositivesPropertyValueItem"
          key={`falsePositives-${falsePositivesItem}`}
        >
          {falsePositivesItem}
        </li>
      ))}
    </ul>
  </EuiText>
);

interface InvestigationFieldsProps {
  investigationFields: string[];
}

export const InvestigationFields = ({ investigationFields }: InvestigationFieldsProps) => (
  <BadgeList badges={investigationFields} data-test-subj="investigationFieldsPropertyValue" />
);

interface LicenseProps {
  license: string;
}

export const License = ({ license }: LicenseProps) => (
  <EuiText size="s" data-test-subj="licensePropertyValue">
    {license}
  </EuiText>
);

interface RuleNameOverrideProps {
  ruleNameOverride: string;
}

export const RuleNameOverride = ({ ruleNameOverride }: RuleNameOverrideProps) => (
  <EuiText size="s" data-test-subj="ruleNameOverridePropertyValue">
    {ruleNameOverride}
  </EuiText>
);

interface ThreatProps {
  threat: Threats;
}

export const Threat = ({ threat }: ThreatProps) => (
  <ThreatEuiFlexGroup threat={filterEmptyThreats(threat)} data-test-subj="threatPropertyValue" />
);

interface ThreatIndicatorPathProps {
  threatIndicatorPath: string;
}

export const ThreatIndicatorPath = ({ threatIndicatorPath }: ThreatIndicatorPathProps) => (
  <EuiText size="s">{threatIndicatorPath}</EuiText>
);

interface TimestampOverrideProps {
  timestampOverride: string;
}

export const TimestampOverride = ({ timestampOverride }: TimestampOverrideProps) => (
  <EuiText size="s" data-test-subj="timestampOverridePropertyValue">
    {timestampOverride}
  </EuiText>
);

interface MaxSignalsProps {
  maxSignals: number;
}

export const MaxSignals = ({ maxSignals }: MaxSignalsProps) => (
  <EuiText size="s" data-test-subj="maxSignalsPropertyValue">
    {maxSignals}
  </EuiText>
);

interface TagsProps {
  tags: string[];
}

export const Tags = ({ tags }: TagsProps) => (
  <BadgeList badges={tags} data-test-subj="tagsPropertyValue" />
);

// eslint-disable-next-line complexity
const prepareAboutSectionListItems = (
  rule: Partial<RuleResponse>,
  hideName?: boolean,
  hideDescription?: boolean
): EuiDescriptionListProps['listItems'] => {
  const aboutSectionListItems: EuiDescriptionListProps['listItems'] = [];

  if (!hideName && rule.name) {
    aboutSectionListItems.push({
      title: i18n.NAME_FIELD_LABEL,
      description: <Name name={rule.name} />,
    });
  }

  if (!hideDescription && rule.description) {
    aboutSectionListItems.push({
      title: i18n.DESCRIPTION_FIELD_LABEL,
      description: <Description description={rule.description} />,
    });
  }

  if (rule.author && rule.author.length > 0) {
    aboutSectionListItems.push({
      title: <span data-test-subj="authorPropertyTitle">{i18n.AUTHOR_FIELD_LABEL}</span>,
      description: <Author author={rule.author} />,
    });
  }

  if (rule.building_block_type) {
    aboutSectionListItems.push({
      title: (
        <span data-test-subj="buildingBlockPropertyTitle">{i18n.BUILDING_BLOCK_FIELD_LABEL}</span>
      ),
      description: <BuildingBlock />,
    });
  }

  if (rule.severity) {
    aboutSectionListItems.push({
      title: <span data-test-subj="severityPropertyTitle">{i18n.SEVERITY_FIELD_LABEL}</span>,
      description: <SeverityBadge value={rule.severity} data-test-subj="severityPropertyValue" />,
    });
  }

  if (rule.severity_mapping && rule.severity_mapping.length > 0) {
    aboutSectionListItems.push(
      ...rule.severity_mapping
        .filter((severityMappingItem) => severityMappingItem.field !== '')
        .map((severityMappingItem, index) => {
          return {
            title:
              index === 0 ? (
                <span data-test-subj="severityOverridePropertyTitle">
                  {i18n.SEVERITY_MAPPING_FIELD_LABEL}
                </span>
              ) : (
                ''
              ),
            description: <SeverityMappingItem severityMappingItem={severityMappingItem} />,
          };
        })
    );
  }

  if (rule.risk_score) {
    aboutSectionListItems.push({
      title: <span data-test-subj="riskScorePropertyTitle">{i18n.RISK_SCORE_FIELD_LABEL}</span>,
      description: <RiskScore riskScore={rule.risk_score} />,
    });
  }

  if (rule.risk_score_mapping && rule.risk_score_mapping.length > 0) {
    aboutSectionListItems.push(
      ...rule.risk_score_mapping
        .filter((riskScoreMappingItem) => riskScoreMappingItem.field !== '')
        .map((riskScoreMappingItem, index) => {
          return {
            title:
              index === 0 ? (
                <span data-test-subj="riskScoreOverridePropertyTitle">
                  {i18n.RISK_SCORE_MAPPING_FIELD_LABEL}
                </span>
              ) : (
                ''
              ),
            description: (
              <RiskScoreMappingItem riskScoreMappingItem={requiredOptional(riskScoreMappingItem)} />
            ),
          };
        })
    );
  }

  if (rule.references && rule.references.length > 0) {
    aboutSectionListItems.push({
      title: <span data-test-subj="referencesPropertyTitle">{i18n.REFERENCES_FIELD_LABEL}</span>,
      description: <References references={rule.references} />,
    });
  }

  if (rule.false_positives && rule.false_positives.length > 0) {
    aboutSectionListItems.push({
      title: (
        <span data-test-subj="falsePositivesPropertyTitle">{i18n.FALSE_POSITIVES_FIELD_LABEL}</span>
      ),
      description: <FalsePositives falsePositives={rule.false_positives} />,
    });
  }

  if (rule.investigation_fields && rule.investigation_fields.field_names.length > 0) {
    aboutSectionListItems.push({
      title: (
        <span data-test-subj="investigationFieldsPropertyTitle">
          {i18n.INVESTIGATION_FIELDS_FIELD_LABEL}
        </span>
      ),
      description: (
        <InvestigationFields investigationFields={rule.investigation_fields.field_names} />
      ),
    });
  }

  if (rule.license) {
    aboutSectionListItems.push({
      title: <span data-test-subj="licensePropertyTitle">{i18n.LICENSE_FIELD_LABEL}</span>,
      description: <License license={rule.license} />,
    });
  }

  if (rule.rule_name_override) {
    aboutSectionListItems.push({
      title: (
        <span data-test-subj="ruleNameOverridePropertyTitle">
          {i18n.RULE_NAME_OVERRIDE_FIELD_LABEL}
        </span>
      ),
      description: <RuleNameOverride ruleNameOverride={rule.rule_name_override} />,
    });
  }

  if (rule.threat && rule.threat.length > 0) {
    aboutSectionListItems.push({
      title: <span data-test-subj="threatPropertyTitle">{i18n.THREAT_FIELD_LABEL}</span>,
      description: <Threat threat={rule.threat} />,
    });
  }

  if ('threat_indicator_path' in rule && rule.threat_indicator_path) {
    aboutSectionListItems.push({
      title: i18n.THREAT_INDICATOR_PATH_LABEL,
      description: <ThreatIndicatorPath threatIndicatorPath={rule.threat_indicator_path} />,
    });
  }

  if (rule.timestamp_override) {
    aboutSectionListItems.push({
      title: (
        <span data-test-subj="timestampOverridePropertyTitle">
          {i18n.TIMESTAMP_OVERRIDE_FIELD_LABEL}
        </span>
      ),
      description: <TimestampOverride timestampOverride={rule.timestamp_override} />,
    });
  }

  if (rule.max_signals) {
    aboutSectionListItems.push({
      title: <span data-test-subj="maxSignalsPropertyTitle">{i18n.MAX_SIGNALS_FIELD_LABEL}</span>,
      description: <MaxSignals maxSignals={rule.max_signals} />,
    });
  }

  if (rule.tags && rule.tags.length > 0) {
    aboutSectionListItems.push({
      title: <span data-test-subj="tagsPropertyTitle">{i18n.TAGS_FIELD_LABEL}</span>,
      description: <Tags tags={rule.tags} />,
    });
  }

  return aboutSectionListItems;
};

export interface RuleAboutSectionProps extends React.ComponentProps<typeof EuiDescriptionList> {
  rule: Partial<RuleResponse>;
  columnWidths?: EuiDescriptionListProps['columnWidths'];
  hideName?: boolean;
  hideDescription?: boolean;
}

export const RuleAboutSection = ({
  rule,
  columnWidths = DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS,
  hideName,
  hideDescription,
  ...descriptionListProps
}: RuleAboutSectionProps) => {
  const aboutSectionListItems = prepareAboutSectionListItems(rule, hideName, hideDescription);

  return (
    <div>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        type={descriptionListProps.type ?? 'column'}
        rowGutterSize={descriptionListProps.rowGutterSize ?? 'm'}
        listItems={aboutSectionListItems}
        columnWidths={columnWidths}
        data-test-subj="listItemColumnStepRuleDescription"
        {...descriptionListProps}
      />
    </div>
  );
};
