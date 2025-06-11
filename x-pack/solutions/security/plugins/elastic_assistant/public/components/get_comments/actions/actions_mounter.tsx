import { Observable } from 'rxjs';
import { CommentServiceActions } from '@kbn/elastic-assistant-shared-state';
import { ClientMessage } from '@kbn/elastic-assistant';
import useObservable from 'react-use/lib/useObservable';
import React, { useEffect, useRef } from 'react';
import { BaseCommentActions } from './base_comment_actions';

type Props = {
  message: ClientMessage
  getActions$: Observable<CommentServiceActions[]>
}

export const ActionsMounter = ({ message, getActions$ }: Props) => {
  const actions = useObservable(getActions$, []);

  const actionMountPointRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountPoint = actionMountPointRef.current;
    const unmountActions = mountPoint ? actions.map(action => action.mount({ message })(mountPoint)) : [];
    return () => {
      unmountActions.forEach(unmount => unmount());
    };
  }, [actions]);

  return <BaseCommentActions message={message}><span ref={actionMountPointRef} /></BaseCommentActions>;
};