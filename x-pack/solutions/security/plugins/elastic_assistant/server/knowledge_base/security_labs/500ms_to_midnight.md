---
title: "500ms to midnight: XZ / liblzma backdoor"
slug: "500ms-to-midnight"
date: "2024-04-05"
description: "Elastic Security Labs is releasing an initial analysis of the XZ Utility backdoor, including YARA rules, osquery, and KQL searches to identify potential compromises."
author:
  - slug: samir-bousseaden
  - slug: mika-ayenson
  - slug: jake-king
image: "500ms-to-midnight.jpg"
category:
  - slug: security-research
  - slug: vulnerability-updates
tags:
  - linux
  - vulnerability
  - cve-2024-3094
---

## Key Takeaways

* On March 29, 2024, Andres Freund identified malicious commits to the command-line utility XZ, impacting versions 5.6.0 and 5.6.1 for Linux, and shared the information on the oss-security mailing list.
* Andres’ discovery was made after an increase of _500ms_ in latency was observed with SSH login attempts initiated from a development system, amongst other anomalies.
* The backdoor identified has been designed to circumvent authentication controls within SSH to remotely execute code, potentially gaining access to other systems in the environment.
* The code commits were added and signed by [JiaT75](https://tukaani.org/xz-backdoor) (now suspended), who contributed to the popular open source project for several years.
* Security researchers are still undertaking an initial analysis of the payload, dissecting both the build process and the backdoor.
* Elastic has released both YARA signatures, detection rules, and osquery queries, allowing Linux system maintainers to understand the impact and block potential compromises early.

## The XZ / liblzma backdoor at a glance

On March 29 2024, the widely adopted XZ package used within many Linux distributions as a library used by the system to interact with SSH client connections (and many other system utilities) was pulled into the spotlight after a _500ms_ delay with intermittent failures. What began as a routine investigation into that anomaly would take a surprising and unexpected twist: malicious, obfuscated code was planted in the package by a maintainer–code that was also in circulation for a few weeks via a poisoned build process.

Andres Freund, the developer who initially [identified the malicious contributions](https://www.openwall.com/lists/oss-security/2024/03/29/4), observed that the changes had been implemented in versions `5.6.0` and `5.6.1` of the XZ Utils package but had not been widely adopted across all Linux distributions, outside of select bleeding-edge variants typically used for early-stage testing.

[Initial analysis](https://bsky.app/profile/filippo.abyssdomain.expert/post/3kowjkx2njy2b) has shown that the backdoor is designed to circumvent authentication controls in `sshd` via `systemd` and attempts to execute code within a pre-authentication context. Observations made so far have shown that the malicious code is not in its final target state and was perhaps caught early through haphazard mistakes the developer neglected to consider, causing impacts to legitimate SSH use cases.

Alongside the malicious package being circulated within a small number of Linux distributions, several observations have been made in the popular package management software HomeBrew, which has impacted some macOS users. The maintainers of Homebrew-- and other software packages that included this library-- are presently rolling back to prior versions that aren't impacted by these malicious changes, although mainly out of an abundance of caution, as compromised builds were only targeting deb and rpm packages.

The following notice was released on the Tukaani Project’s homepage (the project owner of the [XZ Utils Git repository](https://github.com/tukaani-project/xz)) shortly after the news of the backdoor broke.

![XZ Utils backdoor notification on the Tukaani Project](/assets/images/500ms-to-midnight/image2.png "XZ Utils backdoor notification on the Tukaani Project")


The compromise itself, while high risk, is relatively minor in terms of real-world impact given the stage of discovery. This situation should remind security professionals about the importance of understanding supply-chain compromise, monitoring Linux workloads, and auditing system controls. In this situation, defenders had the advantage of time. 

## Backdoor analysis

### XZ backdoor build process:

[CVE-2024-3094](https://nvd.nist.gov/vuln/detail/CVE-2024-3094) explains how the changes in the `liblzma` were created from the malicious additions to the library’s build scripts and directly impacts any software that links the library on an impacted system.

The maliciously modified build script is divided into three stages, starting with the additions in `m4/build-to-host.m4` and progressing through the obfuscation and execution stages. At a high level, some obfuscation techniques include character substitution and selective byte processing commands via the `tr` and `head` commands to decode and execute the malicious payloads in the test files. Interestingly, many impacted tools used are standard Linux system tools typically used by administrators for legitimate purposes.

The [build process](https://gynvael.coldwind.pl/?lang=en&id=782) runs as follows :

* **Stage 0:** The initial malicious code additions attempt to decode the Stage 1 script (hidden code segments) by changing byte values from specific test files, which under normal circumstances appear corrupt, to form a valid XZ stream.
* **Stage 1:** This stage leverages a bash file with special checks (e.g., the Linux architecture the script runs on) and Bash commands to analyze the environment (e.g. `[ "$(uname)" = "Linux" ]`) to ensure compatible conditions are met for the backdoor. Depending on the outcome of the checks, additional malicious scripts or payloads may be executed.
* **Stage 2:** This phase involves an infected.txt file, which details the altered extraction and compilation code modifications, namely:
    * Reconstruction Data: Byte manipulation and decoding techniques on obfuscated compressed data from test files to reconstruct the malicious payload using commands like `sed` and `awk`
    * Obfuscation and Extraction: Complex decryption and obfuscation techniques using the `tr` command to extract the binary backdoor to remain hidden from typical detection mechanisms
    * Build Process Manipulation: This changes the build and compilation steps to embed the binary backdoor into Linux system processes
    * Extension Mechanism: A design that allows for new scripts and updates to the backdoor without modifying the original payload
    * Future Stage Preparation: Sets the groundwork for malicious follow-up activities, like propagating the backdoor 

## Assessing impact:

Given the limited usage of the impacted beta distributions and software, this compromise should impact few systems. Maintainers of Linux systems are however encouraged to ensure systems are not running impacted versions of `xzutils` / `liblzma` by leveraging the following osquery queries:

[Linux](https://gist.github.com/jamesspi/ee8319f55d49b4f44345c626f80c430f):

```
SELECT 'DEB Package' AS source, name, version,
  CASE
    WHEN version LIKE '5.6.0%' OR version LIKE '5.6.1%' THEN 'Potentially Vulnerable'
    ELSE 'Most likely not vulnerable'
  END AS status
FROM deb_packages
WHERE name = 'xz-utils' OR name = 'liblzma' OR name LIKE 'liblzma%'
UNION
SELECT 'RPM Package' AS source, name, version,
  CASE
    WHEN version LIKE '5.6.0%' OR version LIKE '5.6.1%' THEN 'Potentially Vulnerable'
    ELSE 'Most likely not vulnerable'
  END AS status
FROM rpm_packages
WHERE name = 'xz-utils' OR name = 'liblzma' OR name LIKE 'liblzma%';

```

[macOS](https://gist.github.com/jamesspi/5cb060b5e0e2d43222a71c876b56daab):

```
SELECT 'Homebrew Package' AS source, name, version,
  CASE
    WHEN version LIKE '5.6.0%' OR version LIKE '5.6.1%' THEN 'Potentially Vulnerable'
    ELSE 'Most likely not vulnerable'
  END AS status
FROM homebrew_packages
WHERE name = 'xz' OR name = 'liblzma';
```

The following KQL query can be used to query Elastic Defend file events: 

```
event.category : file and host.os.type : (macos or linux) and file.name : liblzma.so.5.6.*
```

Alternatively, manually checking the version of XZ running on a system is as simple as running the [following commands](https://x.com/Kostastsale/status/1773890846250926445?s=20) (from researcher [Kostas](https://twitter.com/Kostastsale)) and checking the output version. Remember, versions 5.6.0 and 5.6.1 are impacted and should be rolled back or updated to a newer version.

```
for xz_p in $(type -a xz | awk '{print $NF}' | uniq); do strings "$xz_p" | grep "xz (XZ Utils)" || echo "No match found for $xz_p"; done
```

## Malware protection

The following [YARA signature](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Linux_Trojan_XZBackdoor.yar) (disk and in-memory) is deployed in Elastic Defend to block the XZ backdoor.

```
rule Linux_Trojan_XZBackdoor {
    meta:
        author = "Elastic Security"
        fingerprint = "f1982d1db5aacd2d6b0b4c879f9f75d4413e0d43e58ea7de2b7dff66ec0f93ab"
        creation_date = "2024-03-30"
        last_modified = "2024-03-31"
        threat_name = "Linux.Trojan.XZBackdoor"
        reference_sample = "5448850cdc3a7ae41ff53b433c2adbd0ff492515012412ee63a40d2685db3049"
        severity = 100
        arch_context = "x86"
        scan_context = "file, memory"
        license = "Elastic License v2"
        os = "linux"
    strings:
        /* potential backdoor kill-switch as per https://gist.github.com/q3k/af3d93b6a1f399de28fe194add452d01?permalink_comment_id=5006558#file-hashes-txt-L115 */
        $a1 = "yolAbejyiejuvnup=Evjtgvsh5okmkAvj"
/* function signature in liblzma used by sshd */
        $a2 = { F3 0F 1E FA 55 48 89 F5 4C 89 CE 53 89 FB 81 E7 00 00 00 80 48 83 EC 28 48 89 54 24 18 48 89 4C 24 10 }
 /* unique byte patterns in backdoored liblzma */
        $b1 = { 48 8D 7C 24 08 F3 AB 48 8D 44 24 08 48 89 D1 4C 89 C7 48 89 C2 E8 ?? ?? ?? ?? 89 C2 }
        $b2 = { 31 C0 49 89 FF B9 16 00 00 00 4D 89 C5 48 8D 7C 24 48 4D 89 CE F3 AB 48 8D 44 24 48 }
        $b3 = { 4D 8B 6C 24 08 45 8B 3C 24 4C 8B 63 10 89 85 78 F1 FF FF 31 C0 83 BD 78 F1 FF FF 00 F3 AB 79 07 }
    condition:
        1 of ($a*) or all of ($b*)
}
```

Detections of this signature  will appear in Elastic as follows: 

![Detecting the Linux.Trojan.XZBackdoor signature in Elastic](/assets/images/500ms-to-midnight/image4.png "Detecting the Linux.Trojan.XZBackdoor signature in Elastic")


## Behavior Detection

Leveraging [Elastic Defend](https://docs.elastic.co/en/integrations/endpoint)’s network and process events, we published a new EQL [detection rule](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_suspicious_ssh_execution_xzbackdoor.toml) to identify instances where the SSHD service starts, spawns a shell process and immediately terminates unexpectedly all within a very short time span: 

```
sequence by host.id, user.id with maxspan=1s
 [process where host.os.type == "linux" and event.type == "start" and event.action == "exec" and process.name == "sshd" and
    process.args == "-D" and process.args == "-R"] by process.pid, process.entity_id
 [process where host.os.type == "linux" and event.type == "start" and event.action == "exec" and process.parent.name == "sshd" and 
  process.executable != "/usr/sbin/sshd"] by process.parent.pid, process.parent.entity_id
 [process where host.os.type == "linux" and event.action == "end" and process.name == "sshd" and process.exit_code != 0] by process.pid, process.entity_id
 [network where host.os.type == "linux" and event.type == "end" and event.action == "disconnect_received" and process.name == "sshd"] by process.pid, process.entity_id
```

![Matches while simulating execution via the backdoor using XZBot - github.com/amlweems/xzbot](/assets/images/500ms-to-midnight/image1.png "Matches while simulating execution via the backdoor using XZBot - github.com/amlweems/xzbot")



![Timeline view displaying events matching the EQL query](/assets/images/500ms-to-midnight/image3.png "Timeline view displaying events matching the EQL query")


## Linux: the final frontier

While observations of supply chain-based attacks or exploitation of vulnerabilities rarely reach this level of global press coverage, Elastic’s observations described in the [2023 Global Threat Report](https://www.elastic.co/explore/security-without-limits/global-threat-report) show that Linux-based signature events continue to grow in our dataset. This growth is partially tied to growth in the systems we observe that report on threat behavior, but it strongly suggests that adversaries are becoming increasingly focused on Linux systems. 

Linux is and will continue to be on the [minds of threat groups](https://www.elastic.co/security-labs/a-peek-behind-the-bpfdoor), as its widespread adoption across the internet reinforces its importance. In this case, adversarial groups were trying to circumvent existing controls that would allow for future compromise through other means.

While the objectives of the person(s) behind the XZ backdoor haven’t been made clear yet, it is within the technical capabilities of many threat entities focused on espionage, extortion, destruction of data, intellectual property theft, and human rights abuses. With the ability to execute code on impacted Internet-accessible systems, it’s reasonable to assume that bad actors would further infiltrate victims. Elastic Security Labs sees that Linux visibility has been dramatically improving and enterprises have started to effectively manage their Linux populations, but many organizations reacting to this supply chain compromise are still at the start of that process.
