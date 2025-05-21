---
title: "Detecting Exploitation of CVE-2021-44228 (Log4j2) with Elastic Security"
slug: "detecting-log4j2-with-elastic-security"
date: "2022-11-22"
description: "This blog post provides a summary of CVE-2021-44228 and provides Elastic Security users with detections to find active exploitation of the vulnerability in their environment. Further updates will be provided to this post as we learn more."
author:
  - slug: jake-king
  - slug: samir-bousseaden
image: "blog-security-detection-720x420.png"
category:
  - slug: security-research
  - slug: vulnerability-updates
---

> - _To understand how Elastic is currently assessing internal risk of this vulnerability in our products please see the advisory_[_here._](https://discuss.elastic.co/t/apache-log4j2-remote-code-execution-rce-vulnerability-cve-2021-44228-esa-2021-31/291476)
> - _This blog has been updated (Dec. 17, 2021) with further detection and hunting improvements since its initial publish._

## Overview

This blog post provides a summary of CVE-2021-44228 and provides Elastic Security users with detections to find active exploitation of the vulnerability in their environment.

Further updates will be provided to this post as we learn more. This version is accurate as of Tuesday, December 14, 2021. Updates from Apache may be investigated directly via the [security page](https://logging.apache.org/log4j/2.x/security.html#) for Log4j2.

## Summary of CVE-2021-44228 (Log4Shell)

Log4j2 is an open source logging framework incorporated into many Java based applications on both end-user systems and servers. In [late November 2021](https://logging.apache.org/log4j/2.x/security.html#), Chen Zhaojun of Alibaba identified a remote code execution vulnerability, ultimately being reported under the CVE ID : [CVE-2021-44228](https://nvd.nist.gov/vuln/detail/CVE-2021-44228), released to the public on December 10, 2021. The vulnerability is exploited through improper deserialization of user-input passed into the framework. It permits remote code execution and it can allow an attacker to leak sensitive data, such as environment variables, or execute malicious software on the target system.

The identified vulnerability impacts all versions of Log4j2 from version 2.0-beta9 to version 2.14.1. Early methods to patch the issue resulted in a number of release candidates, culminating in recommendations to upgrade the framework to Log4j2 2.15.0-rc2 at the time of this post.

Given the trivial complexity and the nature of observed widespread exploitation, mitigation should be considered critical in any environment that has identified software leveraging vulnerable versions of Log4j2.

## Detecting Exploitation of Log4Shell in Elastic Security

Elastic Security users can use the following Event Correlation detection rule to identify active exploitation of the Log4j2 vulnerability. Depending on the format of the host based event data you may need to modify this detection to match your data fields.

**Detection Rule when using Endpoint data**

```
sequence by host.id with maxspan=1m
 [network where event.action == "connection_attempted" and
  process.name : "java" and
  /*
     outbound connection attempt to
     LDAP, RMI or DNS standard ports
     by JAVA process
   */
  destination.port in (1389, 389, 1099, 53, 5353)] by process.pid
 [process where event.type == "start" and

  /* Suspicious JAVA child process */
  process.parent.name : "java" and
   process.name : ("sh",
                   "bash",
                   "dash",
                   "ksh",
                   "tcsh",
                   "zsh",
                   "curl",
                   "perl*",
                   "python*",
                   "ruby*",
                   "php*",
                   "wget")] by process.parent.pid
```

**Detection Rule when using Auditbeat data**

```
sequence by agent.id with maxspan=1m
 [network where event.action == "connected-to" and
  process.name : "java" and
  /*
     outbound connection attempt to
     LDAP, RMI or DNS standard ports
     by JAVA process
   */
  destination.port in (1389, 389, 1099, 53, 5353)] by process.pid
 [process where event.type == "start" and

  /* Suspicious JAVA child process */
  process.parent.name : "java" and
   process.name : ("sh",
                   "bash",
                   "dash",
                   "ksh",
                   "tcsh",
                   "zsh",
                   "curl",
                   "perl*",
                   "python*",
                   "ruby*",
                   "php*",
                   "wget")] by process.parent.pid
```

**Detection rule when using Endgame streamed events**

```
sequence by agent.id with maxspan=1m
 [network where event.category == "network" and
  process.name : "java" and
  /*
     outbound connection attempt to
     LDAP, RMI or DNS standard ports
     by JAVA process
   */
  destination.port in (1389, 389, 1099, 53, 5353)] by process.pid
 [process where event.type == "start" and

  /* Suspicious JAVA child process */
  process.parent.name : "java" and
   process.name : ("sh",
                   "bash",
                   "dash",
                   "ksh",
                   "tcsh",
                   "zsh",
                   "curl",
                   "perl*",
                   "python*",
                   "ruby*",
                   "php*",
                   "wget")] by process.parent.pid
```

This detection rule looks for a sequence of an outbound connection attempt to standard ports for LDAP, RMI and DNS (often abused via recently observed [JAVA/JNDI](https://www.blackhat.com/docs/us-16/materials/us-16-Munoz-A-Journey-From-JNDI-LDAP-Manipulation-To-RCE.pdf) injection attacks) followed by a child process of the same Java process instance.

Now, let’s demonstrate how this rule detects exploitation of the log42j vulnerability:

![The screenshot above shows an attacker exploiting the vulnerability with a base-64 encoded payload](/assets/images/detecting-log4j2-with-elastic-security/blog-elastic-security-1.jpg)

The screenshot above shows an attacker exploiting the vulnerability with a base-64 encoded payload targeting an [example vulnerable application](https://github.com/christophetd/log4shell-vulnerable-app) created by [Christophe Tafani-Dereeper](https://github.com/christophetd).

![This screenshot shows the detection of the active exploitation of CVE-2021-44228 within Elastic Security detailing both the alert and timeline view of the exploit.](/assets/images/detecting-log4j2-with-elastic-security/blog-elastic-security-2.jpg)

This screenshot shows the detection of the active exploitation of CVE-2021-44228 within Elastic Security detailing both the alert and timeline view of the exploit.

![The screenshot above shows in the investigation of the detection alert that Java executed a shell script to download and run a bash script.](/assets/images/detecting-log4j2-with-elastic-security/blog-elastic-security-3.jpg)

The screenshot above shows in the investigation of the detection alert that Java executed a shell script to download and run a bash script.

## Update: Detection & hunting improvements

**Suspicious Shell Commands Execution via Java**

Based on observed publicly known malicious Java classes served via log4j exploit, you can hunt for suspicious shell scripts and ingress tool transfer commands:

```
process where event.type == "start" and
  process.parent.name : "java*" and

  /* Ingress tools transfer via common shell command interpreters */

  /* linux or macos */
  (
   (process.name : ("sh", "bash", "python*") and
    process.command_line : ("*curl*|*sh*", "*wget*|*bash", "*curl*|*bash*", "*curl*|*bash*", "*http*|*sh*", "*python*http*")) or

  /* windows */
  (process.name : ("powershell.exe", "pwsh.exe", "cmd.exe") and
   process.command_line : ("*.downloadstring*", "*.downloadfile*", "*.downloaddata*", "*BitsTransfer*", "* -enc*", "* IEX*", "*wp-content*", "*wp-admin*", "*wp-includes*", "*$*$*$*$*$*", "*^*^*^*^*^*^*^*^*^*", "*.replace*", "*start-process*", "*http*", "*cmd*powershell*")))
```

**Untrusted File Execution via JAVA**

Identifies when a JAVA interpreter creates an executable file (PE/ELF) and the file is subsequently executed.

**Detection Rule when using Endpoint data**

```
sequence by host.id with maxspan=5m
 [ file where event.type != "deletion" and
  process.name : ("java", "java.exe", "javaw.exe") and

  (file.extension : ("exe", "com", "pif", "scr") or
      /* Match Windows PE files by header data (MZ) */
  file.Ext.header_bytes : ("4d5a*", "7f454c46*")) and

  not file.path :  ("?:\\Program Files\\*",
                    "?:\\Program Files (x86)\\*") ] by file.path
 [ process where event.type == "start" and
  not process.code_signature.trusted == true ] by process.executable
```

**Detection rule when using Endgame streamed events**

```
sequence by agent.id with maxspan=5m
  [ file where event.type != "deletion"
    process.name : ("java", "java.exe", "javaw.exe")] by file_path
  [ process where event.type == "start" and
  not process.code_signature.trusted == true] by process_path
```

**Potential CoinMiner activity**

Process with command line common to cryptocurrency miner (most observed campaigns leveraging log4j exploit are coinminers):

```
process where event.type == "start" and
 process.command_line :
       ("* pool.*", "*-u*--coin*", "*.xmr.*", "*.xmr1.*",
        "*stratum*", "*elitter.net*", "*cryptonight*",
        "*-a scrypt*", "*stratum1*", "*-userpass*", "*-max-cpu-usage*",
	  "*qhor.net*", "*-wallet*pool*", "*--donate-level*", "*supportxmr.com*")
```

Other relevant post exploitation detections :

[Attempt to Disable IPTables or Firewall](https://github.com/elastic/detection-rules/blob/main/rules/linux/defense_evasion_attempt_to_disable_iptables_or_firewall.toml)

[Tampering of Bash Command-Line History](https://github.com/elastic/detection-rules/blob/main/rules/linux/defense_evasion_deletion_of_bash_command_line_history.toml)

[System Log File Deletion](https://github.com/elastic/detection-rules/blob/main/rules/linux/defense_evasion_log_files_deleted.toml)

[Potential Reverse Shell Activity via Terminal](https://github.com/elastic/detection-rules/blob/main/rules/cross-platform/execution_revershell_via_shell_cmd.toml)

[Suspicious JAVA Child Process](https://github.com/elastic/detection-rules/blob/main/rules/cross-platform/execution_suspicious_jar_child_process.toml)

[Attempt to Disable Syslog Service](https://github.com/elastic/detection-rules/blob/main/rules/linux/defense_evasion_attempt_to_disable_syslog_service.toml)

## Elastic Endgame EQL Queries

**Suspicious Java Netcon followed by Unusual Child Process**

```
sequence with maxspan=5s
 [network where process_name == "java*" and destination_port in (1389, 389, 1099, 53, 5353) and
  destination_address != "127.0.0.1" and not destination_address == "::1"] by pid
 [process where opcode in (1,5) and
  /* Suspicious JAVA child process */
  parent_process_name == "java*" and
   process_name in ("sh", "bash", "dash", "ksh", "tcsh", "zsh", "curl", "perl*", "python*", "ruby*", "php*", "wget", "powershell.exe", "cmd.exe")] by ppid
```

**Suspicious Shell Commands Execution via Java**

```
process where opcode in (1,5) and
  parent_process_name == "java*" and
  /* Ingress tools transfer via common shell command interpreters */

  /* linux or macos */
 (
  (process_name in ("sh", "bash", "python") and
   wildcard(command_line, "*curl*|*sh*", "*wget*|*bash", "*curl*|*bash*", "*curl*|*bash*", "*http*|*sh*", "*python*http*")) or
  /* windows */
  (process_name in ("powershell.exe", "pwsh.exe", "cmd.exe") and
   wildcard(command_line,"*.downloadstring*", "*.downloadfile*", "*.downloaddata*", "*BitsTransfer*", "* -enc*", "* IEX*", "*wp-content*", "*wp-admin*", "*wp-includes*", "*$*$*$*$*$*", "*^*^*^*^*^*^*^*^*^*","*.replace*", "*start-process*", "*http*", "*cmd*powershell*")))
```

**Common Coin Miners as a descendant of JAVA**

```
process where opcode in (1, 3, 4, 5) and
 descendant of [process where opcode in (1, 3, 4, 5) and process_name == "java*"] and
 wildcard(command_line, "* pool.*", "*-u*--coin*", "*.xmr.*", "*.xmr1.*", "*stratum*", "*elitter.net*", "*cryptonight*", "*-a scrypt*", "*stratum1*",
"*-userpass*", "*-max-cpu-usage*", "*qhor.net*", "*-wallet*pool*",  "*--donate-level*", "*supportxmr.com*",
/* evasion commands */
"*base64*", "*history -c*", "*ld.so.preload*", "*nmi_watchdog*", "*ufw*disable*", "*.bash_history*", "*chmod*+x*",
"*tor2web*", "*kill*-9*", "*python*-c*http*")
```

**Untrusted File Execution via JAVA**

```
sequence with maxspan=2m
  [ file where opcode != 2 and file_name == "*.exe" and process_name == "java*"] by file_path
  [ process where opcode in (1,5)] by process_path
```

## Community Detections

A number of community members discussing widespread exploitation of the vulnerability have provided insights into a number of early detection methods that analysts may leverage to identify if systems they are using have been exploited or are under active exploitation:

- A series of [payloads](https://gist.github.com/nathanqthai/01808c569903f41a52e7e7b575caa890) have been shared by the [GreyNoise team](https://twitter.com/GreyNoiseIO/status/1469430126819618821), including payloads containing both encoded and decoded variants for analysts looking to explore logs stored within their systems. This has been complemented with a list of initial [tagged IPs](https://twitter.com/GreyNoiseIO/status/1469334738225741832) attempting exploitation of the vulnerability.

- [Florian Roth of Nextron Systems](https://twitter.com/cyb3rops/status/1469243580929740802?s=21) has provided a [series of checks](https://gist.github.com/Neo23x0/e4c8b03ff8cdf1fa63b7d15db6e3860b) for local exploitation using grep / zgrep, alongside some initial YARA signatures in a Gist listed on his Github account. Florian also shared a method for generating [Thinkst](https://canarytokens.org/generate#) [CanaryTokens](https://twitter.com/cyb3rops/status/1469405846010572816) to test systems you may manage for exploitability.

- [Rob Fuller (Mubix)](https://twitter.com/mubix) has shared a list of known file hashes for vulnerable versions of the framework, [here](https://github.com/mubix/CVE-2021-44228-Log4Shell-Hashes).

## Additional Mitigation Strategies

Outside of the recommended guidance from the Apache team regarding the deployment of the latest, patched versions of the Log4j2 framework to update, a number of mitigations have been widely suggested to prevent exploitation:

- [Fastly](https://www.fastly.com/blog/digging-deeper-into-log4shell-0day-rce-exploit-found-in-log4j) have suggested checking if your version of Log4j supports executing the JVM with JAVA_OPTS=-Dlog4j2.formatMsgNoLookups=true to disable the lookup functionality to the remote server. This should apply to versions 2.10.0 through 2.15.0.

- To prevent lateral movement from a vulnerable host, or exploitation over the network, limiting connectivity from potentially vulnerable systems to external resources to trusted applications and / or services is recommended.

## Thank you, from Elastic Security.

We want to thank all of the security teams across the globe for your tireless work today and through the weekend, especially those of you listed in this post. Openness and collaboration in the security community to safeguard all users is paramount when facing such a serious and pervasive vulnerability. We want you to know we are here with you every step of the way.

Existing Elastic Security can access these capabilities within the product. If you’re new to Elastic Security, take a look at our [Quick Start guides](https://www.elastic.co/training/free#quick-starts) (bite-sized training videos to get you started quickly) or our [free fundamentals training courses](https://www.elastic.co/training/free#fundamentals). You can always get started with a [free 14-day trial of Elastic Cloud](https://cloud.elastic.co/registration). Or [download](https://www.elastic.co/downloads/) the self-managed version of the Elastic Stack for free.

## Reference Material

[https://www.lunasec.io/docs/blog/log4j-zero-day/](https://www.lunasec.io/docs/blog/log4j-zero-day/)

[https://www.tenable.com/blog/cve-2021-44228-proof-of-concept-for-critical-apache-log4j-remote-code-execution-vulnerability](https://www.tenable.com/blog/cve-2021-44228-proof-of-concept-for-critical-apache-log4j-remote-code-execution-vulnerability)

[https://www.crowdstrike.com/blog/log4j2-vulnerability-analysis-and-mitigation-recommendations/](https://www.crowdstrike.com/blog/log4j2-vulnerability-analysis-and-mitigation-recommendations/)

[https://mbechler.github.io/2021/12/10/PSA_Log4Shell_JNDI_Injection/](https://mbechler.github.io/2021/12/10/PSA_Log4Shell_JNDI_Injection/)

[https://www.greynoise.io/viz/query/?gnql=CVE-2021-44228](https://www.greynoise.io/viz/query/?gnql=CVE-2021-44228)

[https://logging.apache.org/log4j/2.x/security.html#](https://logging.apache.org/log4j/2.x/security.html#)

[https://github.com/christophetd/log4shell-vulnerable-app](https://github.com/christophetd/log4shell-vulnerable-app)
