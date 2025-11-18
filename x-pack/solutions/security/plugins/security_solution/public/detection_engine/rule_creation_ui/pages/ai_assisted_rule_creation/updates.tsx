/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { pick } from 'lodash';
import type { EuiCommentProps } from '@elastic/eui';
import {
  EuiCommentList,
  EuiText,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';
import { RuleScheduleSection } from '../../../rule_management/components/rule_details/rule_schedule_section';
import { RuleAboutSection } from '../../../rule_management/components/rule_details/rule_about_section';
import type { RuleCreationStreamEvent } from '../../../../../server/lib/detection_engine/ai_assisted_rule_creation/iterative_agent/stream_rule_creation';

export const RULE_CREATION_NODE_NAMES = {
  PROCESS_KNOWLEDGE_BASE: 'processKnowledgeBase',
  GET_INDEX_PATTERN: 'getIndexPattern',
  ESQL_QUERY_CREATION: 'esqlQueryCreation',
  GET_TAGS: 'getTags',
  CREATE_RULE_NAME_AND_DESCRIPTION: 'createRuleNameAndDescription',
  ADD_SCHEDULE: 'addSchedule',
  ADD_DEFAULT_FIELDS_TO_RULES: 'addDefaultFieldsToRules',
} as const;

export type RuleCreationNodeName =
  (typeof RULE_CREATION_NODE_NAMES)[keyof typeof RULE_CREATION_NODE_NAMES];

export const RULE_CREATION_NODE_ORDER = [
  RULE_CREATION_NODE_NAMES.PROCESS_KNOWLEDGE_BASE,
  RULE_CREATION_NODE_NAMES.GET_INDEX_PATTERN,
  RULE_CREATION_NODE_NAMES.ESQL_QUERY_CREATION,
  RULE_CREATION_NODE_NAMES.GET_TAGS,
  RULE_CREATION_NODE_NAMES.CREATE_RULE_NAME_AND_DESCRIPTION,
  RULE_CREATION_NODE_NAMES.ADD_SCHEDULE,
  RULE_CREATION_NODE_NAMES.ADD_DEFAULT_FIELDS_TO_RULES,
] as const;

const {
  PROCESS_KNOWLEDGE_BASE,
  GET_INDEX_PATTERN,
  ESQL_QUERY_CREATION,
  GET_TAGS,
  CREATE_RULE_NAME_AND_DESCRIPTION,
  ADD_SCHEDULE,
  ADD_DEFAULT_FIELDS_TO_RULES,
} = RULE_CREATION_NODE_NAMES;

interface StageStatusMessageProps {
  /** The name/title of the stage to be displayed in bold */
  title: string;
  /** Size of the text, defaults to 's' */
  size?: 's' | 'xs' | 'm';
  /** Data test subject for testing */
  'data-test-subj'?: string;
}

/**
 * Component that displays a standardized completion message for AI rule creation stages.
 * Shows the stage name in bold followed by a success message.
 */
export const StageStatusMessage: React.FC<StageStatusMessageProps> = ({
  title,
  size = 's',
  'data-test-subj': dataTestSubj = 'stage-status-message',
}) => {
  return (
    <EuiText size={size} data-test-subj={dataTestSubj}>
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.stageCompleted"
        defaultMessage="{title} processing stage finished successfully."
        values={{
          title: <strong>{title}</strong>,
        }}
      />
    </EuiText>
  );
};

/**
 * Helper to safely extract and display updated fields
 */
function renderUpdatedFields(fields: Record<string, unknown>): React.ReactNode {
  if (!fields || Object.keys(fields).length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.noFieldsUpdated"
          defaultMessage="No fields were updated in this stage."
        />
      </EuiText>
    );
  }

  return (
    <>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.fieldsUpdated"
          defaultMessage="Updated fields:"
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock language="json" fontSize="m" paddingSize="s" isCopyable>
        {JSON.stringify(fields, null, 2)}
      </EuiCodeBlock>
    </>
  );
}

export function getRuleCreationNodeInfo(update: RuleCreationStreamEvent): EuiCommentProps {
  const nodeName = update.nodeName;
  const ruleState = update.nodeState;

  switch (nodeName) {
    case 'start':
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: 'AI assisted rule creation initiated',
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.start"
                  defaultMessage="AI assisted rule creation initiated."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };

    case PROCESS_KNOWLEDGE_BASE:
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: 'Knowledge Base Processing',
        event: (
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.processKnowledgeBase.event"
            defaultMessage="completed knowledge bases analysis"
          />
        ),
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiText size="s">
                {!ruleState.knowledgeBase?.documents?.length ? (
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.processKnowledgeBase.noDocuments"
                    defaultMessage="No relevant knowledge base documents found."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.processKnowledgeBase.foundDocuments"
                    defaultMessage="Found relevant knowledge base documents: {documents}"
                    values={{
                      documents: (
                        <>{ruleState.knowledgeBase?.documents?.map((doc) => doc.name).join(', ')}</>
                      ),
                    }}
                  />
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };

    case GET_INDEX_PATTERN:
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: 'Index Pattern Discovery',
        event: (
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.getIndexPattern.event"
            defaultMessage="identified relevant index patterns"
          />
        ),
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.getIndexPatterns.shortlisted"
                    defaultMessage="Shortlisted index patterns:"
                  />
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiFlexGroup gutterSize="xs" wrap>
                  {ruleState.indices.shortlistedIndexPatterns.map((pattern: string) => (
                    <EuiFlexItem grow={false} key={pattern}>
                      <EuiBadge color="hollow">{pattern}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };

    case ESQL_QUERY_CREATION:
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: 'ES|QL Query Generation',
        event: (
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.esqlQueryCreation.event"
            defaultMessage="generated ES|QL query"
          />
        ),
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            {ruleState.rule?.query ? (
              <EuiFlexItem>
                <EuiSpacer size="s" />
                <EuiCodeBlock language="esql" fontSize="m" paddingSize="s" isCopyable>
                  {ruleState.rule?.query || ''}
                </EuiCodeBlock>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
      };

    case GET_TAGS:
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: 'Tag Suggestion',
        event: (
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.getTags.event"
            defaultMessage="suggested rule tags"
          />
        ),
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              {ruleState.rule?.tags &&
              Array.isArray(ruleState.rule.tags) &&
              ruleState.rule.tags.length > 0 ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.getTags.tagsApplied"
                      defaultMessage="Following tags were identified and applied to rule:"
                    />
                  </EuiText>
                  <EuiSpacer size="xs" />
                  <EuiFlexGroup gutterSize="xs" wrap>
                    {ruleState.rule.tags.map((tag: string) => (
                      <EuiFlexItem grow={false} key={tag}>
                        <EuiBadge color="hollow">{tag}</EuiBadge>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </>
              ) : (
                renderUpdatedFields({
                  'rule.tags': ruleState.rule?.tags,
                })
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };

    case CREATE_RULE_NAME_AND_DESCRIPTION:
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: 'Rule Metadata Creation',
        event: (
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.createRuleNameAndDescription.event"
            defaultMessage="created rule metadata"
          />
        ),
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <RuleAboutSection rule={pick(ruleState.rule, ['name', 'description'])} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };

    case ADD_SCHEDULE:
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: 'Schedule Optimization',
        event: (
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.addSchedule.event"
            defaultMessage="suggested execution schedule"
          />
        ),
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <RuleScheduleSection rule={pick(ruleState.rule, ['interval', 'from', 'to'])} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };

    case ADD_DEFAULT_FIELDS_TO_RULES:
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: 'Rule Finalization',
        event: (
          <FormattedMessage
            id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.addDefaultFieldsToRules.event"
            defaultMessage="finalized rule configuration"
          />
        ),
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <RuleAboutSection
                rule={pick(ruleState.rule, [
                  'severity',
                  'risk_score',
                  'references',
                  'severity_mapping',
                  'risk_score_mapping',
                  'related_integrations',
                  'required_fields',
                  'actions',
                  'exceptions_list',
                  'false_positives',
                  'threat',
                  'author',
                  'setup',
                  'max_signals',
                ])}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };

    default:
      return {
        username: 'AI assistant',
        timelineAvatarAriaLabel: update.nodeName || 'Unknown operation',
        event: 'update',
        timestamp: new Date(update.timestamp).toLocaleString(),
        children: (
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <StageStatusMessage title={update.nodeName || 'Unknown operation'} />
            </EuiFlexItem>
            <EuiFlexItem>
              {update.nodeState.rule && Object.keys(update.nodeState.rule).length > 0 ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.unknownNode.ruleFields"
                      defaultMessage="Rule fields created at this stage:"
                    />
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiCodeBlock language="json" fontSize="m" paddingSize="s" isCopyable>
                    {JSON.stringify(update.nodeState.rule, null, 2)}
                  </EuiCodeBlock>
                </>
              ) : (
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.unknownNode.noFields"
                    defaultMessage="No rule properties generated at this stage yet."
                  />
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
  }
}

export const AiAssistedRuleUpdates = ({
  updates,
  isStreaming,
}: {
  updates: RuleCreationStreamEvent[];
  isStreaming: boolean;
}) => {
  const comments: EuiCommentProps[] = updates
    .toReversed()
    .map((update) => getRuleCreationNodeInfo(update));

  if (isStreaming) {
    comments.unshift({
      username: 'AI assistant',
      timelineAvatarAriaLabel: 'AI Assistant',
      event: (
        <FormattedMessage
          id="xpack.securitySolution.detectionEngine.aiAssistedRuleCreation.updates.streaming.event"
          defaultMessage="analyzing request"
        />
      ),
      children: (
        <EuiText size="s" color="subdued">
          {getNextNodeTitle(updates.at(-1)?.nodeName)}
        </EuiText>
      ),
      timestamp: new Date().toLocaleString(),
    });
  }

  return (
    <EuiCommentList
      comments={comments}
      aria-label="AI-assisted rule creation progress"
      data-test-subj="ai-assisted-rule-updates"
    />
  );
};

export function getNextNodeTitle(currentNode: RuleCreationNodeName | string | undefined): string {
  if (!currentNode) {
    return 'Processing your request...';
  }

  const currentIndex = RULE_CREATION_NODE_ORDER.indexOf(currentNode as RuleCreationNodeName);

  if (currentIndex === -1 || currentIndex === RULE_CREATION_NODE_ORDER.length - 1) {
    return 'Processing your request...';
  }

  const nextNode = RULE_CREATION_NODE_ORDER[currentIndex + 1];

  const map = {
    [PROCESS_KNOWLEDGE_BASE]: 'Knowledge Base Processing...',
    [GET_INDEX_PATTERN]: 'Index Patterns Discovery...',
    [ESQL_QUERY_CREATION]: 'ES|QL Query Generation...',
    [GET_TAGS]: 'Tags Suggestion...',
    [CREATE_RULE_NAME_AND_DESCRIPTION]: 'Rule Metadata Creation...',
    [ADD_SCHEDULE]: 'Schedule Suggestion...',
    [ADD_DEFAULT_FIELDS_TO_RULES]: 'Rule Finalization...',
  };
  return map[nextNode];
}
