/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { RuleHistoryItem } from '../../../../../common/api/detection_engine/rule_management';
import { describeAction } from './describe_action';
import * as i18n from './translations';
import { extractChangedFieldNames } from './extract_changed_field_names';
import { IGNORED_DIFF_FIELDS } from './constants';

interface ChangeHistoryFlyoutHeaderProps {
  item: RuleHistoryItem;
  titleId: string;
}

export function ChangeHistoryFlyoutHeader({
  item,
  titleId,
}: ChangeHistoryFlyoutHeaderProps): JSX.Element {
  const userName = item.user?.name ?? i18n.SYSTEM_USER_LABEL;
  const changedFields = useMemo(() => extractChangedFieldNames(item, IGNORED_DIFF_FIELDS), [item]);
  const prevRevision = item.old_values?.revision as number | undefined;

  return (
    <>
      <EuiTitle size="m">
        <h2 id={titleId}>{i18n.CHANGE_DETAILS_FLYOUT_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiText size="s">
          {prevRevision !== undefined ? (
            <i18n.COMPARED_REVISIONS
              revisionBefore={prevRevision}
              revisionAfter={item.rule.revision}
            />
          ) : (
            <i18n.VIEW_REVISION revision={item.rule.revision} />
          )}
        </EuiText>
        <EuiText size="s">
          <i18n.UPDATED_BY
            action={describeAction(item.action)}
            username={userName}
            timestamp={item.timestamp}
          />
        </EuiText>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {changedFields.length > 0 && (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
          <EuiText size="s">
            <i18n.FIELD_CHANGES fields={changedFields} />
          </EuiText>
        </EuiFlexGroup>
      )}
    </>
  );
}
