/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare module 'dom-to-image-more' {
  export interface DomToImageOptions {
    quality?: number;
    bgcolor?: string;
    cacheBust?: boolean;
    width?: number;
    height?: number;
    scale?: number;
    style?: Record<string, string>;
    filter?: (node: Node) => boolean;
  }

  export function toBlob(node: Node, options?: DomToImageOptions): Promise<Blob>;
  export function toPng(node: Node, options?: DomToImageOptions): Promise<string>;
}
