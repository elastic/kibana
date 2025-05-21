/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';

export const withLazyHook = <P extends {}, PInjected extends keyof P>(
  Component: React.ComponentType<P>,
  hookImport: () => Promise<Pick<P, PInjected>>,
  fallback: React.ReactNode = null
) => {
  return React.memo<Omit<P, PInjected>>(function WithLazyHook(props) {
    const [lazyHookProp, setLazyHookProp] = useState<Pick<P, PInjected>>();

    useEffect(() => {
      hookImport().then((hook) => {
        setLazyHookProp(() => hook);
      });
    }, []);

    return lazyHookProp ? <Component {...(props as P)} {...lazyHookProp} /> : <>{fallback}</>;
  });
};
