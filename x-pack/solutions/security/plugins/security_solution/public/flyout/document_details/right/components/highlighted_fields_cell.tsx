/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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

const EMPTY_ARRAY: string[] = [];

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
  /**
   * Caps the amount of values displayed in the cell.
   * If the limit is reached a "show more" button is being rendered
   */
  displayValuesLimit?: number;
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
  displayValuesLimit = 2,
}) => {
  const agentType: ResponseActionAgentType = useMemo(() => {
    return getAgentTypeForAgentIdField(originalField);
  }, [originalField]);
  const { euiTheme } = useEuiTheme();
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const toggleContentExpansion = useCallback(
    () => setIsContentExpanded((currentIsOpen) => !currentIsOpen),
    []
  );

  const visibleValues = useMemo(() => {
    /**
     * Check if a limit was set and if the limit
     * is within the values size
     */
    if (
      displayValuesLimit &&
      displayValuesLimit > 0 &&
      displayValuesLimit < (values?.length ?? 0)
    ) {
      return values?.slice(0, displayValuesLimit);
    }

    return values;
  }, [values, displayValuesLimit]);

  const overflownValues = useMemo(() => {
    /**
     * Check if a limit was set and if the limit
     * is within the values size
     */
    if (
      displayValuesLimit &&
      displayValuesLimit > 0 &&
      displayValuesLimit < (values?.length ?? 0)
    ) {
      return values?.slice(displayValuesLimit);
    }

    return EMPTY_ARRAY;
  }, [values, displayValuesLimit]);

  const isContentTooLarge = useMemo(
    () => !!displayValuesLimit && displayValuesLimit < (values?.length ?? 0),
    [displayValuesLimit, values]
  );

  const renderValue = useCallback(
    (value: string, i: number) => (
      <div key={`${i}-${value}`} data-test-subj={`${value}-${HIGHLIGHTED_FIELDS_CELL_TEST_ID}`}>
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
    ),
    [agentType, ancestorsIndexName, field, scopeId, showPreview]
  );

  if (values === null) return null;

  return (
    <div
      css={css`
        div {
          margin-bottom: ${euiTheme.size.xs};
        }

        div:last-child {
          margin-bottom: 0;
        }
      `}
    >
      {visibleValues != null && visibleValues.map((value, i) => renderValue(value, i))}
      {isContentExpanded && overflownValues?.map(renderValue)}
      {isContentTooLarge && (
        <EuiButtonEmpty
          size="xs"
          flush="both"
          onClick={toggleContentExpansion}
          data-test-subj="toggle-show-more-button"
        >
          {isContentExpanded ? (
            <FormattedMessage
              id="xpack.securitySolution.flyout.alertsHighlightedField.showMore"
              defaultMessage="Show less"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.flyout.alertsHighlightedField.showLess"
              defaultMessage="Show more"
            />
          )}
        </EuiButtonEmpty>
      )}
    </div>
  );
};
