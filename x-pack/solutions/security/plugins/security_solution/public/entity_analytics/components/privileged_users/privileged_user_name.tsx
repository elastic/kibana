/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiCodeBlock,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

export const PrivilegedUserName: React.FC<{ userName: string; objects: object[] }> = ({
  userName,
  objects,
}) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const showFlyout = () => setIsFlyoutVisible(true);
  const closeFlyout = () => setIsFlyoutVisible(false);

  return (
    <>
      <EuiButtonEmpty onClick={showFlyout}>{userName}</EuiButtonEmpty>
      {isFlyoutVisible && (
        <EuiFlyout onClose={closeFlyout}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>{userName}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {objects.map((obj) => (
              <>
                <EuiCodeBlock language="json" isCopyable>
                  {JSON.stringify(obj, null, 2)}
                </EuiCodeBlock>
                <EuiSpacer size="m" />
              </>
            ))}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
