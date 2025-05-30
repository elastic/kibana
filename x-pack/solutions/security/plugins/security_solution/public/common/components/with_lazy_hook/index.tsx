/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';

/**
 * HOC to wrap a component with a lazy-loaded hook.
 * This allows the component to use a hook that is imported dynamically,
 * which can be useful for reducing the initial bundle size.
 *
 * @param Component - The component to wrap, it have to accept the hook as a prop (e.g. { useSomeHook: UseSomeHook }).
 * @param hookImport - A function that returns a promise resolving to an object with the hook's prop (e.g. { useSomeHook: () => {} }).
 * @param fallback - A fallback React node to render while the hook is being loaded.
 */
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
