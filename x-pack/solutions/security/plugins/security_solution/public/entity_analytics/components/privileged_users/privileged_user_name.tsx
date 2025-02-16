/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { PrivilegedUserDoc } from '../../../../common/api/entity_analytics/privmon';
import { PrivilegedUserFlyout } from './privileged_user_flyout';

export const PrivilegedUserName: React.FC<{ privilegedUser: PrivilegedUserDoc }> = ({
  privilegedUser,
}) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const showFlyout = () => setIsFlyoutVisible(true);
  const closeFlyout = () => setIsFlyoutVisible(false);

  return (
    <>
      <EuiButtonEmpty onClick={showFlyout}>{privilegedUser.user.name}</EuiButtonEmpty>
      {isFlyoutVisible && (
        <PrivilegedUserFlyout privilegedUser={privilegedUser} closeFlyout={closeFlyout} />
      )}
    </>
  );
};
