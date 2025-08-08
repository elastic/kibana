/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { getAgentTypeForAgentIdField } from '../../../../common/lib/endpoint/utils/get_agent_type_for_agent_id_field';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatus } from '../../../../common/components/endpoint/agents/agent_status';
import { AGENT_STATUS_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import {
  HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_CELL_TEST_ID,
  HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID,
} from './test_ids';
import { isFlyoutLink } from '../../../shared/utils/link_utils';
import { PreviewLink } from '../../../shared/components/preview_link';

export interface HighlightedFieldsCellProps {
  /**
   * Highlighted field's name used to know what component to display
   */
  field: string;
  /**
   * Highlighted field's original name, when the field is overridden
   */
  originalField?: string;
  /**
   * Highlighted field's value to display
   */
  values: string[] | null | undefined;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   * Only needed if alerts page flyout (which has PreviewLink), NOT in the AI for SOC alert summary flyout.
   */
  scopeId?: string;
  /**
   * If true, we show a PreviewLink for some specific fields.
   * This is false by default (for the AI for SOC alert summary page) and will be true for the alerts page.
   */
  showPreview?: boolean;
  /**
   * The indexName to be passed to the flyout preview panel
   * when clicking on "Source event" id
   */
  ancestorsIndexName?: string;
}

/**
 * Renders a component in the highlighted fields table cell based on the field name
 */
export const HighlightedFieldsCell: FC<HighlightedFieldsCellProps> = ({
  values,
  field,
  originalField = '',
  scopeId = '',
  showPreview = false,
  ancestorsIndexName,
}) => {
  const agentType: ResponseActionAgentType = useMemo(() => {
    return getAgentTypeForAgentIdField(originalField);
  }, [originalField]);
  const { euiTheme } = useEuiTheme();

  return (
    <React.Fragment
      css={css`
        div {
          margin-bottom: ${euiTheme.size.xs};
        }

        div:last-child {
          margin-bottom: 0;
        }
      `}
    >
      {values != null &&
        values.map((value, i) => {
          return (
            <div
              key={`${i}-${value}`}
              data-test-subj={`${value}-${HIGHLIGHTED_FIELDS_CELL_TEST_ID}`}
            >
              {showPreview && isFlyoutLink({ field, scopeId }) ? (
                <PreviewLink
                  field={field}
                  value={value}
                  scopeId={scopeId}
                  data-test-subj={HIGHLIGHTED_FIELDS_LINKED_CELL_TEST_ID}
                  ancestorsIndexName={ancestorsIndexName}
                />
              ) : field === AGENT_STATUS_FIELD_NAME ? (
                <AgentStatus
                  agentId={String(value ?? '')}
                  agentType={agentType}
                  data-test-subj={HIGHLIGHTED_FIELDS_AGENT_STATUS_CELL_TEST_ID}
                />
              ) : (
                <span data-test-subj={HIGHLIGHTED_FIELDS_BASIC_CELL_TEST_ID}>{value}</span>
              )}
            </div>
          );
        })}
    </React.Fragment>
  );
};
