/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { CommentServiceActions } from '@kbn/elastic-assistant-shared-state';
import { ClientMessage } from '@kbn/elastic-assistant';
import useObservable from 'react-use/lib/useObservable';
import React, { useEffect, useRef } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { BaseCommentActions } from './base_comment_actions';

interface Props {
  message: ClientMessage;
  getActions$: Observable<CommentServiceActions[]>;
}

export const CommentActionsMounter = ({ message, getActions$ }: Props) => {
  const actions = useObservable(getActions$, []);

  const actionMountPointRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountPoint = actionMountPointRef.current;
    const unmountActions = mountPoint
      ? actions.map((action) => action.mount({ message })(mountPoint))
      : [];
    return () => {
      unmountActions.forEach((unmount) => unmount());
    };
  }, [actions, message]);

  return (
    <BaseCommentActions message={message}>
      <EuiFlexGroup alignItems="center" gutterSize="none" ref={actionMountPointRef} />
    </BaseCommentActions>
  );
};
