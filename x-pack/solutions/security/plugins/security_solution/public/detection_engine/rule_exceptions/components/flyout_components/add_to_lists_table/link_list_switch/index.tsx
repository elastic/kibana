/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo } from 'react';
import type { EuiSwitchProps } from '@elastic/eui';
import { EuiFlexItem, EuiSwitch } from '@elastic/eui';
import type { ExceptionListRuleReferencesSchema } from '../../../../../../../common/api/detection_engine/rule_exceptions';

import * as i18n from './translations';

export const LinkListSwitch = memo(
  ({
    list,
    linkedList,
    onListLinkChange,
    dataTestSubj,
  }: {
    list: ExceptionListRuleReferencesSchema;
    linkedList: ExceptionListRuleReferencesSchema[];
    dataTestSubj: string;
    onListLinkChange?: (listSelectedToAdd: ExceptionListRuleReferencesSchema[]) => void;
  }) => {
    const isListLinked = useMemo(
      () => Boolean(linkedList.find((l) => l.id === list.id)),
      [linkedList, list.id]
    );
    const onLinkOrUnlinkList = useCallback<EuiSwitchProps['onChange']>(
      ({ target: { checked } }) => {
        const newLinkedLists = !checked
          ? linkedList?.filter((item) => item.id !== list.id)
          : [...linkedList, list];
        if (typeof onListLinkChange === 'function') onListLinkChange(newLinkedLists);
      },
      [linkedList, onListLinkChange, list]
    );

    return (
      <EuiFlexItem grow={false}>
        <EuiSwitch
          data-test-subj={dataTestSubj}
          onChange={onLinkOrUnlinkList}
          checked={isListLinked}
          label={i18n.LINK_LIST_SWITCH_ARIA_LABEL(list.name)}
          showLabel={false}
        />
      </EuiFlexItem>
    );
  }
);

LinkListSwitch.displayName = 'LinkListSwitch';
