/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { Ecs as ElasticEcs } from '@elastic/ecs';
import { AttachmentType } from '@kbn/cases-plugin/common';
import { APP_ID } from '../../../../../common';
import { useKibana } from '../../../../common/lib/kibana';
import type { TimelineNonEcsData } from '../../../../../common/search_strategy';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';
import type { AlertTableContextMenuItem } from '../types';

export interface UseAddToCaseActions {
  onMenuItemClick: () => void;
  ariaLabel?: string;
  ecsData?: Ecs;
  nonEcsData?: TimelineNonEcsData[];
  onSuccess?: () => Promise<void>;
  isActiveTimelines: boolean;
  isInDetections: boolean;
  refetch?: (() => void) | undefined;
}

export const useAddToCaseActions = ({
  onMenuItemClick,
  ariaLabel,
  ecsData,
  nonEcsData,
  onSuccess,
  isActiveTimelines,
  isInDetections,
  refetch,
}: UseAddToCaseActions) => {
  const { cases: casesUi } = useKibana().services;
  const userCasesPermissions = casesUi.helpers.canUseCases([APP_ID]);

  const isAlert = useMemo(() => {
    return ecsData?.event?.kind?.includes('signal');
  }, [ecsData]);

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: ecsData?._id ?? '',
            index: ecsData?._index ?? '',
            type: AttachmentType.alert,
            rule: casesUi.helpers.getRuleIdFromEvent({ ecs: ecsData, data: nonEcsData ?? [] }),
          },
        ]
      : [];
  }, [casesUi.helpers, ecsData, nonEcsData]);

  const onCaseSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess();
    }

    if (refetch) {
      refetch();
    }
  }, [onSuccess, refetch]);

  const createCaseArgs = useMemo(() => {
    return {
      onClose: onMenuItemClick,
      onSuccess: onCaseSuccess,
    };
  }, [onMenuItemClick, onCaseSuccess]);

  const createCaseFlyout = casesUi.hooks.useCasesAddToNewCaseFlyout(createCaseArgs);

  const selectCaseArgs = useMemo(() => {
    return {
      onClose: onMenuItemClick,
      onSuccess: onCaseSuccess,
    };
  }, [onMenuItemClick, onCaseSuccess]);

  const selectCaseModal = casesUi.hooks.useCasesAddToExistingCaseModal(selectCaseArgs);
  const observables = useMemo(
    () => (ecsData ? getObservablesFromEcsData(ecsData as unknown as ElasticEcs) : undefined), // TODO: fix this type cast
    [ecsData]
  );
  const handleAddToNewCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    createCaseFlyout.open({
      attachments: caseAttachments,
      observables,
    });
  }, [onMenuItemClick, createCaseFlyout, caseAttachments, observables]);

  const handleAddToExistingCaseClick = useCallback(() => {
    // TODO rename this, this is really `closePopover()`
    onMenuItemClick();
    selectCaseModal.open({
      getAttachments: () => caseAttachments,
      getObservables: observables ? () => observables : undefined,
    });
  }, [caseAttachments, onMenuItemClick, observables, selectCaseModal]);

  const addToCaseActionItems: AlertTableContextMenuItem[] = useMemo(() => {
    if (
      (isActiveTimelines || isInDetections) &&
      userCasesPermissions.createComment &&
      userCasesPermissions.read &&
      isAlert
    ) {
      return [
        // add to existing case menu item
        {
          'aria-label': ariaLabel,
          'data-test-subj': 'add-to-existing-case-action',
          key: 'add-to-existing-case-action',
          onClick: handleAddToExistingCaseClick,
          size: 's',
          name: ADD_TO_EXISTING_CASE,
        },
        // add to new case menu item
        {
          'aria-label': ariaLabel,
          'data-test-subj': 'add-to-new-case-action',
          key: 'add-to-new-case-action',
          onClick: handleAddToNewCaseClick,
          size: 's',
          name: ADD_TO_NEW_CASE,
        },
      ];
    }
    return [];
  }, [
    isActiveTimelines,
    isInDetections,
    userCasesPermissions.createComment,
    userCasesPermissions.read,
    isAlert,
    ariaLabel,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
  ]);

  return {
    addToCaseActionItems,
    handleAddToNewCaseClick,
    handleAddToExistingCaseClick,
  };
};

const getIPType = (ip: string): 'IPV4' | 'IPV6' => {
  if (ip.includes(':')) {
    return 'IPV6';
  }
  return 'IPV4';
};

// https://www.elastic.co/docs/reference/ecs/ecs-hash
const HASH_FIELDS = [
  'cdhash',
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512',
  'ssdeep',
  'tlsh',
] as const;

// https://www.elastic.co/docs/reference/ecs/ecs-hash
// TODO - support 'email.attachments.file'
const HASH_PARENTS = ['dll', 'file', 'process'] as const;

const getHashValues = (ecsData: ElasticEcs): string[] => {
  const res: string[] = [];

  HASH_PARENTS.forEach((parent) => {
    HASH_FIELDS.forEach((field) => {
      const value = ecsData[parent]?.hash?.[field];
      if (value && typeof value === 'string') {
        res.push(value);
      } else if (Array.isArray(value)) {
        res.push(...value);
      }
    });
  });

  return res;
};

export const getObservablesFromEcsData = (ecsData: ElasticEcs) => {
  const observables = [];

  // Source IP
  if (ecsData.source?.ip) {
    const ips = Array.isArray(ecsData.source?.ip) ? ecsData.source?.ip : [ecsData.source?.ip];

    ips.forEach((ip) => {
      const ipType = getIPType(ip);
      observables.push({
        typeKey: ipType === 'IPV4' ? 'observable-type-ipv4' : 'observable-type-ipv6',
        value: ip,
        description: null,
      });
    });
  }

  // Destination IP
  if (ecsData.destination?.ip) {
    const ips = Array.isArray(ecsData.destination?.ip)
      ? ecsData.destination?.ip
      : [ecsData.destination?.ip];

    ips.forEach((ip) => {
      const ipType = getIPType(ip);
      observables.push({
        typeKey: ipType === 'IPV4' ? 'observable-type-ipv4' : 'observable-type-ipv6',
        value: ip,
        description: null,
      });
    });
  }

  // URL
  // TODO - Pending review

  // Host name
  if (ecsData.host?.name) {
    const hostnames = Array.isArray(ecsData.host?.name) ? ecsData.host?.name : [ecsData.host?.name];
    observables.push(
      ...hostnames.map((name) => ({
        typeKey: 'observable-type-hostname',
        value: name,
        description: null,
      }))
    );
  }

  // File hash
  const hashValues = getHashValues(ecsData);
  if (hashValues.length > 0) {
    observables.push(
      ...hashValues.map((hash) => ({
        typeKey: 'observable-type-file-hash',
        value: hash,
        description: null,
      }))
    );
  }

  // File path
  if (ecsData.file?.path) {
    const paths = Array.isArray(ecsData.file?.path) ? ecsData.file?.path : [ecsData.file?.path];
    observables.push(
      ...paths.map((path) => ({
        typeKey: 'observable-type-file-path',
        value: path,
        description: null,
      }))
    );
  }

  // TODO - Pending review
  // email.from.address, or email.sender.address??
  if (ecsData.email?.from?.address) {
    const addresses = Array.isArray(ecsData.email?.from?.address)
      ? ecsData.email?.from?.address
      : [ecsData.email?.from?.address];
    observables.push(
      ...addresses.map((address) => ({
        typeKey: 'observable-type-email',
        value: address,
        description: null,
      }))
    );
  }
  // Domain
  if (ecsData.dns?.question?.name) {
    const names = Array.isArray(ecsData.dns?.question?.name)
      ? ecsData.dns?.question?.name
      : [ecsData.dns?.question?.name];
    observables.push(
      ...names.map((name) => ({
        typeKey: 'observable-type-domain',
        value: name,
        description: null,
      }))
    );
  }

  // remove duplicates of key type and value pairs
  return [...new Set(observables.map((obj) => JSON.stringify(obj)))].map((str) => JSON.parse(str));
};
