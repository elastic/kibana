/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generic common interface for a Host Virtual Machine.
 */
export interface HostVm {
  type: SupportedVmManager;
  name: string;
  exec: (command: string) => Promise<HostVmExecResponse>;
  mount: (localDir: string, hostVmDir: string) => Promise<HostVmMountResponse>;
  unmount: (hostVmDir: string) => Promise<void>;
  /** @deprecated use `upload` */
  transfer: (localFilePath: string, destFilePath: string) => Promise<HostVmTransferResponse>;
  /** Uploads/copies a file from the local machine to the VM */
  upload: (localFilePath: string, destFilePath: string) => Promise<HostVmTransferResponse>;
  /** Downloads a file from the host VM to the local machine */
  download: (vmFilePath: string, localFilePath: string) => Promise<HostVmTransferResponse>;
  destroy: () => Promise<void>;
  info: () => string;
  stop: () => void;
  start: () => void;
}

export type SupportedVmManager = 'multipass' | 'vagrant';
export interface HostVmExecResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}
export interface HostVmMountResponse {
  hostDir: string;
  unmount: () => Promise<void>;
}
export interface HostVmTransferResponse {
  /** The path of the file that was either uploaded to the host VM or downloaded to the local machine from the VM */
  filePath: string;
  /** Delete the file from the host VM or from the local machine depending on what client method was used */
  delete: () => Promise<HostVmExecResponse>;
}
