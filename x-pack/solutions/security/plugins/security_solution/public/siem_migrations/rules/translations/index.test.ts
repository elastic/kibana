/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MigrationSource } from '../../common/types';
import { RULE_MIGRATION_VENDOR_COPY } from '.';
import type { RuleMigrationVendorCopy } from './types';

const getMessageText = (node: React.ReactNode): string => {
  if (typeof node === 'string') {
    return node;
  }

  if (React.isValidElement<{ defaultMessage?: string }>(node) && node.props.defaultMessage) {
    return node.props.defaultMessage;
  }

  throw new Error('Unexpected vendor copy message node');
};

const getSnapshotCopy = (copy: RuleMigrationVendorCopy) => ({
  ...copy,
  missingLookupsList: {
    ...copy.missingLookupsList,
    description: getMessageText(copy.missingLookupsList.description),
  },
});

describe('RULE_MIGRATION_VENDOR_COPY', () => {
  it('snapshots user-visible vendor copy to catch accidental changes', () => {
    expect({
      [MigrationSource.SPLUNK]: getSnapshotCopy(RULE_MIGRATION_VENDOR_COPY[MigrationSource.SPLUNK]),
      [MigrationSource.QRADAR]: getSnapshotCopy(RULE_MIGRATION_VENDOR_COPY[MigrationSource.QRADAR]),
      [MigrationSource.SENTINEL]: getSnapshotCopy(
        RULE_MIGRATION_VENDOR_COPY[MigrationSource.SENTINEL]
      ),
    }).toMatchInlineSnapshot(`
      Object {
        "microsoft-sentinel": Object {
          "checkResources": Object {
            "description": "For best translation results, we will review the data for watchlists. If found, we will ask you to upload them next.",
            "title": "Check for watchlists",
          },
          "copyrightNotice": "Microsoft, Microsoft Azure, and Microsoft Sentinel are trademarks or registered trademarks of Microsoft Corporation in the United States and other countries.",
          "lookupsFileUpload": Object {
            "filePickerId": "watchlistsFilePicker",
            "label": "Upload watchlist files",
            "prompt": "Select or drag and drop the exported watchlist files",
          },
          "missingLookupsList": Object {
            "clearEmptyTestId": "watchlistNameClear",
            "clearEmptyTooltip": "Mark the watchlist as empty",
            "copyNameTestId": "watchlistNameCopy",
            "copyNameTooltip": "Copy watchlist name",
            "description": "Below are the watchlists found in your rules. Export them from Microsoft Sentinel and upload here. Exported Watchlist must be in <armlink>ARM Resource format</armlink>. CSV content should be included in the <code>rawContent</code> property of the watchlist.",
          },
          "missingResources": Object {
            "readyDescription": "You can also upload the missing watchlists for more accurate results.",
            "uploadTitle": "Upload missing watchlists",
          },
          "originalRule": Object {
            "title": "Microsoft Sentinel KQL query",
            "tooltip": "This is the original Microsoft Sentinel KQL query in ARM template JSON format as exported from Microsoft Sentinel",
          },
          "resourceDataInputStep": Object {
            "copyTitle": "Watchlists found in your rules",
            "description": "We've also found watchlists within your rules. To fully translate those rules containing these watchlists, follow the step-by-step guide to export and upload them all.",
            "fileUploadTitle": "Upload your watchlists export",
            "title": "Upload watchlists",
          },
        },
        "qradar": Object {
          "checkResources": Object {
            "description": "For best translation results, we will review the data for reference sets. If found, we will ask you to upload them next.",
            "title": "Check for reference sets",
          },
          "copyrightNotice": "IBM® and QRadar® are registered trademarks of International Business Machines Corporation, registered in many jurisdictions worldwide.",
          "lookupsFileUpload": Object {
            "filePickerId": "referenceSetsFilePicker",
            "label": "Upload reference set files",
            "prompt": "Select or drag and drop the exported reference set files",
          },
          "missingLookupsList": Object {
            "clearEmptyTestId": "referenceSetNameClear",
            "clearEmptyTooltip": "Mark the reference set as empty",
            "copyNameTestId": "referenceSetNameCopy",
            "copyNameTooltip": "Copy reference set name",
            "description": "Below are the reference set found in your rules. Export them from QRadar and upload here.",
          },
          "missingResources": Object {
            "readyDescription": "You can also upload the missing reference sets for more accurate results.",
            "uploadTitle": "Upload missing reference sets",
          },
          "originalRule": Object {
            "title": "QRadar rule definition",
            "tooltip": "This is the original QRadar rule definition in XML format as exported from QRadar",
          },
          "resourceDataInputStep": Object {
            "copyTitle": "Reference sets found in your rules",
            "description": "We've also found reference sets within your rules. To fully translate those rules containing these reference sets, upload them all.",
            "fileUploadTitle": "Update your reference sets export",
            "title": "Upload reference sets",
          },
        },
        "splunk": Object {
          "checkResources": Object {
            "description": "For best translation results, we will review the data for macros and lookups. If found, we will ask you to upload them next.",
            "title": "Check for macros and lookups",
          },
          "copyrightNotice": "Splunk and related marks are trademarks or registered trademarks of Splunk LLC in the United States and other countries.",
          "lookupsFileUpload": Object {
            "filePickerId": "lookupsFilePicker",
            "label": "Upload lookups files",
            "prompt": "Select or drag and drop the exported lookup files",
          },
          "missingLookupsList": Object {
            "clearEmptyTestId": "lookupNameClear",
            "clearEmptyTooltip": "Mark the lookup as empty",
            "copyNameTestId": "lookupNameCopy",
            "copyNameTooltip": "Copy lookup name",
            "description": "Log in to your Splunk admin account, go to the {app}, download the following lookups individually and upload them below. You can also omit lookups that are empty or not needed, and they will be ignored in the translation.",
          },
          "missingResources": Object {
            "readyDescription": "You can also upload the missing macros & lookups for more accurate results.",
            "uploadTitle": "Upload missing macros and lookup lists.",
          },
          "originalRule": Object {
            "title": "Splunk query",
            "tooltip": "This is the rule name detected in the export file uploaded for translation",
          },
          "resourceDataInputStep": Object {
            "copyTitle": "Lookups found in your rules",
            "description": "We've also found lookups within your rules. To fully translate those rules containing these lookups, follow the step-by-step guide to export and upload them all.",
            "fileUploadTitle": "Update your lookups export",
            "title": "Upload lookups",
          },
        },
      }
    `);
  });
});
