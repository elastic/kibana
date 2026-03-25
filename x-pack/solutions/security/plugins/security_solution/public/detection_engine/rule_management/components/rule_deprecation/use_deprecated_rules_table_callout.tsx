/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { usePrebuiltRulesDeprecationReview } from '../../logic/prebuilt_rules/use_prebuilt_rules_deprecation_review';
import { DeprecatedRulesCallout } from './deprecated_rules_callout';
import { DeprecatedRulesModal } from './deprecated_rules_modal';
import * as i18n from './translations';

export const useDeprecatedRulesTableCallout = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { data, isLoading } = usePrebuiltRulesDeprecationReview(null);
  const rules = data?.rules ?? [];

  const showModal = useCallback(() => setIsModalVisible(true), []);
  const hideModal = useCallback(() => setIsModalVisible(false), []);

  if (isLoading || rules.length === 0) {
    return null;
  }

  return (
    <>
      <DeprecatedRulesCallout
        title={i18n.DEPRECATION_CALLOUT_TITLE(rules.length)}
        description={i18n.DEPRECATION_TABLE_CALLOUT_DESCRIPTION}
        buttonLabel={i18n.REVIEW_DEPRECATED_RULES}
        onButtonClick={showModal}
        data-test-subj="deprecated-rules-table-callout"
      />
      {isModalVisible && (
        <DeprecatedRulesModal rules={rules} isLoading={isLoading} onClose={hideModal} />
      )}
    </>
  );
};
