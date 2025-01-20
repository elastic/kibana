/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddAnalyticsCollectionModal } from './add_analytics_collection_modal';

interface AddAnalyticsCollectionProps {
  disabled?: boolean;
  render?: (onClick: () => void) => React.ReactNode;
}
export const AddAnalyticsCollection: React.FC<AddAnalyticsCollectionProps> = ({
  render,
  disabled,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  return (
    <>
      {render ? (
        render(showModal)
      ) : (
        <EuiButton
          fill
          iconType="plusInCircle"
          onClick={showModal}
          disabled={disabled}
          data-test-subj="create-analytics-collection-btn"
        >
          {i18n.translate('xpack.enterpriseSearch.analytics.collections.create.buttonTitle', {
            defaultMessage: 'Create collection',
          })}
        </EuiButton>
      )}
      {isModalVisible && <AddAnalyticsCollectionModal onClose={closeModal} />}
    </>
  );
};
