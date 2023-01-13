/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import React from 'react';
import { debounce, filter, first } from 'rxjs/operators';
import { timer } from 'rxjs';
import { SecurityPluginStart } from '@kbn/security-plugin/public';

export interface PluginStartDependencies {
  security: SecurityPluginStart;
}

export class TestEndpointsPlugin implements Plugin<void, void, object, PluginStartDependencies> {
  public setup(core: CoreSetup<PluginStartDependencies>) {
    // Prevent auto-logout on server `401` errors.
    core.http.anonymousPaths.register('/app/expired_session_test');
    core.application.register({
      id: 'expired_session_test',
      title: 'Expired Session Test',
      async mount({ element }) {
        (window as any).kibanaFetch = core.http.fetch;
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    // Prevent auto-logout on server `401` errors.
    core.http.anonymousPaths.register('/authentication/app');

    const networkIdle$ = core.http.getLoadingCount$().pipe(
      debounce(() => timer(3000)),
      filter((count) => count === 0),
      first()
    );

    core.application.register({
      id: 'authentication_app',
      title: 'Authentication app',
      appRoute: '/authentication/app',
      chromeless: true,
      async mount({ element }) {
        // Promise is resolved as soon there are no requests has been made in the last 3 seconds. We need this to make
        // sure none of the unrelated requests interferes with the test logic.
        networkIdle$.toPromise().then(() => {
          ReactDOM.render(
            <div data-test-subj="testEndpointsAuthenticationApp">Authenticated!</div>,
            element
          );
        });
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    core.application.register({
      id: 'user_profiles_app',
      title: 'User Profiles app',
      async mount({ element }) {
        const [, { security }] = await core.getStartServices();

        const [currentUserProfile, otherUserProfiles] = await Promise.all([
          security.userProfiles.getCurrent({ dataPath: '*' }),
          security.userProfiles.bulkGet({
            uids: new Set(new URLSearchParams(location.search).getAll('uid')),
            dataPath: '*',
          }),
        ]);

        ReactDOM.render(
          <div>
            <div data-test-subj="testEndpointsUserProfilesAppCurrentUserProfile">
              {currentUserProfile?.user.username}:{JSON.stringify(currentUserProfile?.data)}
            </div>
            {otherUserProfiles.map((userProfile) => (
              <div
                data-test-subj={`testEndpointsUserProfilesAppUserProfile_${userProfile.user.username}`}
              >
                {userProfile.user.username}:{JSON.stringify(userProfile.data)}
              </div>
            ))}
          </div>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
  }
  public start() {}
  public stop() {}
}
