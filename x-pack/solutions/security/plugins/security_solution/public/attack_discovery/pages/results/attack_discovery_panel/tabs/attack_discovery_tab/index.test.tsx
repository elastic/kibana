/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { AttackDiscoveryTab } from '.';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscovery } from '../../../../mock/mock_attack_discovery';
import { ATTACK_CHAIN, DETAILS, SUMMARY } from './translations';

describe('AttackDiscoveryTab', () => {
  const mockReplacements: Replacements = {
    '5e454c38-439c-4096-8478-0a55511c76e3': 'foo.hostname',
    '3bdc7952-a334-4d95-8092-cd176546e18a': 'bar.username',
    'c5ba13c4-2391-4045-962e-ec965fc1eb06': 'SRVWIN07',
    '2da30969-4127-4ddb-ba0c-2d8ac44d15d7': 'Administrator',
  };

  describe('when showAnonymized is false', () => {
    const showAnonymized = false;

    beforeEach(() =>
      render(
        <TestProviders>
          <AttackDiscoveryTab
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
            showAnonymized={showAnonymized}
          />
        </TestProviders>
      )
    );

    it('renders the summary using the real host and username', () => {
      const markdownFormatters = screen.getAllByTestId('attackDiscoveryMarkdownFormatter');
      const summaryMarkdown = markdownFormatters[0];

      expect(summaryMarkdown).toHaveTextContent(
        'A multi-stage malware attack was detected on foo.hostname involving bar.username. A suspicious application delivered malware, attempted credential theft, and established persistence.'
      );
    });

    it('renders the details using the real host and username', () => {
      const markdownFormatters = screen.getAllByTestId('attackDiscoveryMarkdownFormatter');
      const detailsMarkdown = markdownFormatters[1];

      expect(detailsMarkdown).toHaveTextContent(
        `The following attack progression appears to have occurred on the host foo.hostname involving the user bar.username: A suspicious application named "My Go Application.app" was launched, likely through a malicious download or installation. This application spawned child processes to copy a malicious file named "unix1" to the user's home directory and make it executable. The malicious "unix1" file was then executed, attempting to access the user's login keychain and potentially exfiltrate credentials. The suspicious application also launched the "osascript" utility to display a fake system dialog prompting the user for their password, a technique known as credentials phishing. This appears to be a multi-stage attack involving malware delivery, privilege escalation, credential access, and potentially data exfiltration. The attacker may have used social engineering techniques like phishing to initially compromise the system. The suspicious "My Go Application.app" exhibits behavior characteristic of malware families that attempt to steal user credentials and maintain persistence. Mitigations should focus on removing the malicious files, resetting credentials, and enhancing security controls around application whitelisting, user training, and data protection.`
      );
    });
  });

  describe('when showAnonymized is true', () => {
    const showAnonymized = true;

    beforeEach(() =>
      render(
        <TestProviders>
          <AttackDiscoveryTab
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
            showAnonymized={showAnonymized}
          />
        </TestProviders>
      )
    );

    it('renders the summary using the anonymized host and username', () => {
      const markdownFormatters = screen.getAllByTestId('attackDiscoveryMarkdownFormatter');
      const summaryMarkdown = markdownFormatters[0];

      expect(summaryMarkdown).toHaveTextContent(
        'A multi-stage malware attack was detected on 5e454c38-439c-4096-8478-0a55511c76e3 involving 3bdc7952-a334-4d95-8092-cd176546e18a. A suspicious application delivered malware, attempted credential theft, and established persistence.'
      );
    });

    it('renders the details using the anonymized host and username', () => {
      const markdownFormatters = screen.getAllByTestId('attackDiscoveryMarkdownFormatter');
      const detailsMarkdown = markdownFormatters[1];

      expect(detailsMarkdown).toHaveTextContent(
        `The following attack progression appears to have occurred on the host 5e454c38-439c-4096-8478-0a55511c76e3 involving the user 3bdc7952-a334-4d95-8092-cd176546e18a: A suspicious application named "My Go Application.app" was launched, likely through a malicious download or installation. This application spawned child processes to copy a malicious file named "unix1" to the user's home directory and make it executable. The malicious "unix1" file was then executed, attempting to access the user's login keychain and potentially exfiltrate credentials. The suspicious application also launched the "osascript" utility to display a fake system dialog prompting the user for their password, a technique known as credentials phishing. This appears to be a multi-stage attack involving malware delivery, privilege escalation, credential access, and potentially data exfiltration. The attacker may have used social engineering techniques like phishing to initially compromise the system. The suspicious "My Go Application.app" exhibits behavior characteristic of malware families that attempt to steal user credentials and maintain persistence. Mitigations should focus on removing the malicious files, resetting credentials, and enhancing security controls around application whitelisting, user training, and data protection.`
      );
    });
  });

  describe('common cases', () => {
    beforeEach(() =>
      render(
        <TestProviders>
          <AttackDiscoveryTab
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
          />
        </TestProviders>
      )
    );

    it('renders the expected summary title', () => {
      const summaryTitle = screen.getByTestId('summaryTitle');

      expect(summaryTitle).toHaveTextContent(SUMMARY);
    });

    it('renders the expected details title', () => {
      const detailsTitle = screen.getByTestId('detailsTitle');

      expect(detailsTitle).toHaveTextContent(DETAILS);
    });

    it('renders the expected attack chain title', () => {
      const attackChainTitle = screen.getByTestId('attackChainTitle');

      expect(attackChainTitle).toHaveTextContent(ATTACK_CHAIN);
    });

    it('renders the attack chain', () => {
      const attackChain = screen.getByTestId('attackChain');

      expect(attackChain).toBeInTheDocument();
    });

    it('renders the "View in AI Assistant" button', () => {
      const viewInAiAssistantButton = screen.getByTestId('viewInAiAssistant');

      expect(viewInAiAssistantButton).toBeInTheDocument();
    });

    it('renders the "Investigate in Timeline" button', () => {
      const investigateInTimelineButton = screen.getByTestId('investigateInTimelineButton');

      expect(investigateInTimelineButton).toBeInTheDocument();
    });
  });

  describe('when multiple substitutions for the same replacement are required', () => {
    it('replaces all occurrences', () => {
      const detailsMarkdownRequiresMultipleSubstitutions =
        '## Microsoft Office spawned PowerShell obfuscation on host {{ host.name c5ba13c4-2391-4045-962e-ec965fc1eb06 }} by user {{ user.name 2da30969-4127-4ddb-ba0c-2d8ac44d15d7 }}\n* **Tactic:** Initial Access, Execution\n* **Technique:** Phishing, Command and Scripting Interpreter\n* **Subtechnique:** Spearphishing Attachment, PowerShell\n\nThe user {{ user.name 2da30969-4127-4ddb-ba0c-2d8ac44d15d7 }} opened a malicious Microsoft Word document ({{ process.parent.executable C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE }}) that dropped and executed a VBScript file ({{ process.parent.args wscript C:\\ProgramData\\WindowsAppPool\\AppPool.vbs }}). This VBScript file then created a scheduled task ({{ process.command_line \\"C:\\Windows\\System32\\cmd.exe\\" /C schtasks /create /F /sc minute /mo 1 /tn \\"\\WindowsAppPool\\AppPool\\" /tr \\"wscript /b \\"C:\\ProgramData\\WindowsAppPool\\AppPool.vbs\\"\\" }}) to execute the VBScript every minute. The VBScript then spawned an obfuscated PowerShell process ({{ process.command_line \\"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe\\" -exec bypass -file C:\\ProgramData\\WindowsAppPool\\AppPool.ps1  }}). This sequence of events suggests an attempt to gain initial access to the host and establish persistence through scheduled tasks and obfuscated PowerShell scripts.';

      const expected = `Microsoft Office spawned PowerShell obfuscation on host SRVWIN07 by user Administrator

Tactic: Initial Access, Execution
Technique: Phishing, Command and Scripting Interpreter
Subtechnique: Spearphishing Attachment, PowerShell

The user Administrator opened a malicious Microsoft Word document (C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE) that dropped and executed a VBScript file (wscript C:\\ProgramData\\WindowsAppPool\\AppPool.vbs). This VBScript file then created a scheduled task (\\"C:\\Windows\\System32\\cmd.exe\\" /C schtasks /create /F /sc minute /mo 1 /tn \\"\\WindowsAppPool\\AppPool\\" /tr \\"wscript /b \\"C:\\ProgramData\\WindowsAppPool\\AppPool.vbs\\"\\") to execute the VBScript every minute. The VBScript then spawned an obfuscated PowerShell process (\\"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe\\" -exec bypass -file C:\\ProgramData\\WindowsAppPool\\AppPool.ps1 ). This sequence of events suggests an attempt to gain initial access to the host and establish persistence through scheduled tasks and obfuscated PowerShell scripts.`;

      const mockAttackDiscoveryWithMultipleSubstitutions = {
        ...mockAttackDiscovery,
        detailsMarkdown: detailsMarkdownRequiresMultipleSubstitutions,
      };

      render(
        <TestProviders>
          <AttackDiscoveryTab
            attackDiscovery={mockAttackDiscoveryWithMultipleSubstitutions}
            replacements={mockReplacements}
            showAnonymized={false}
          />
        </TestProviders>
      );

      const markdownFormatters = screen.getAllByTestId('attackDiscoveryMarkdownFormatter');
      const detailsMarkdown = markdownFormatters[1];

      expect(detailsMarkdown.textContent).toEqual(expected);
    });
  });
});
