---
title: "Katz and Mouse Game:  MaaS Infostealers Adapt to Patched Chrome Defenses"
slug: "katz-and-mouse-game"
date: "2024-10-28"
description: "Elastic Security Labs breaks down bypass implementations from the infostealer ecosystem’s reaction to Chrome 127's Application-Bound Encryption scheme."
author:
  - slug: jia-yu-chan
  - slug: salim-bitam
  - slug: daniel-stepanic
  - slug: samir-bousseaden
  - slug: cyril-francois
  - slug: seth-goodwin
image: "Security Labs Images 2.jpg"
category:
  - slug: malware-analysis
tags:
  - infostealer
  - chrome
  - cookie
  - VIDAR
  - STEALC
  - LUMMA
  - METASTEALER
  - PHEMEDRONE
  - XENOSTEALER
---

# Introduction

In July, Google [announced](https://security.googleblog.com/2024/07/improving-security-of-chrome-cookies-on.html) a new protection mechanism for cookies stored within Chrome on Windows, known as Application-Bound Encryption. There is no doubt this security implementation has raised the bar and directly impacted the malware ecosystem. After months with this new feature, many infostealers have written new code to bypass this protection (as the Chrome Security Team predicted) in order to stay competitive in the market and deliver capabilities that reliably retrieve cookie data from Chrome browsers.

Elastic Security Labs has been tracking a subset of this activity, identifying multiple techniques used by different malware families to circumvent App-Bound Encryption. While the ecosystem is still evolving in light of this pressure, our goal is to share technical details that help organizations understand and defend against these techniques. In this article, we will cover the different methods used by the following infostealer families:

 - STEALC/VIDAR
 - METASTEALER
 - PHEMEDRONE
 - XENOSTEALER
 - LUMMA

# Key takeaways

 - Latest versions of infostealers implement bypasses around Google’s recent cookie protection feature using Application-Bound Encryption
 - Techniques include integrating offensive security tool ChromeKatz, leveraging COM to interact with Chrome services and decrypt the app-bound encryption key, and using the remote debugging feature within Chrome
 - Defenders should actively monitor for different cookie bypass techniques against Chrome on Windows in anticipation of future mitigations and bypasses likely to emerge in the near- to mid-term
 - Elastic Security provides mitigations through memory signatures, behavioral rules, and hunting opportunities to enable faster identification and response to infostealer activity

# Background

Generically speaking, cookies are used by web applications to store visitor information in the browser the visitor uses to access that web app. This information helps the web app track that user, their preferences, and other information from location to location– even across devices.

The authentication token is one use of the client-side data storage structures that enables much of how modern web interactivity works. These tokens are stored by the browser after the user has successfully authenticated with a web application. After username and password, after multifactor authentication (MFA) via one-time passcodes or biometrics, the web application “remembers” your browser is you via the exchange of this token with each subsequent web request.

A malicious actor who gets access to a valid authentication token can reuse it to impersonate the user to that web service with the ability to take over accounts, steal personal or financial information, or perform other actions as that user such as transfer financial assets.

Cybercriminals use infostealers to steal and commoditize this type of information for their financial gain.

## Google Chrome Cookie Security

Legacy versions of Google Chrome on Windows used the Windows native [Data Protection API](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-use-data-protection) (DPAPI) to encrypt cookies and protect them from other user contexts. This provided adequate protection against several attack scenarios, but any malicious software running in the targeted user’s context could decrypt these cookies using the DPAPI methods directly. Unfortunately, this context is exactly the niche that infostealers often find themselves in after social engineering for initial access. The DPAPI scheme is now [well known to attackers](https://posts.specterops.io/operational-guidance-for-offensive-user-dpapi-abuse-1fb7fac8b107) with several attack vectors; from local decryption using the API, to stealing the masterkey and decrypting remotely, to abusing the domain-wide backup DPAPI key in an enterprise environment.

With the release of Chrome 127 in July 2024, Google [implemented](https://developer.chrome.com/release-notes/127) Application-Bound Encryption of browser data. This mechanism directly addressed many common DPAPI attacks against Windows Chrome browser data–including cookies. It does this by storing the data in encrypted datafiles, and using a service running as SYSTEM to verify any decryption attempts are coming from the Chrome process before returning the key to that process for decryption of the stored data.

![Chrome 127 Application-Bound Encryption Scheme. Source: https://security.googleblog.com/2024/07/improving-security-of-chrome-cookies-on.html](/assets/images/katz-and-mouse-game/image5.png)



While it is our view that this encryption scheme is not a panacea to protect all browser data (as the Chrome Security Team acknowledges in their release) we do feel it has been successful in driving malware authors to TTPs that are more overtly malicious, and easier for defenders to identify and respond to.

# Stealer Bypass Techniques, Summarized

The following sections will describe specific infostealer techniques used to bypass Google’s App-Bound Encryption feature as observed by Elastic. Although this isn’t an exhaustive compilation of bypasses, and development of these families is ongoing, they represent an interesting dynamic within the infostealer space showing how malware developers responded to Google’s recently updated security control. The techniques observed by our team include:

 - Remote debugging via Chrome’s DevTools Protocol
 - Reading process memory of Chrome network service process (ChromeKatz and ```ReadProcessMemory``` (RPM))
 - Elevating to ```SYSTEM``` then decrypting ```app_bound_encryption_key``` with the ```DecryptData``` method of ```GoogleChromeElevationService``` through COM

![Timeline of events](/assets/images/katz-and-mouse-game/image30.png)

## STEALC/VIDAR

Our team observed new code introduced to STEALC/VIDAR related to the cookie bypass technique around September 20th. These were atypical samples that stood out from previous versions and were implemented as embedded 64-bit PE files along with conditional checks. Encrypted values in the SQLite databases where Chrome stores its data are now prefixed with v20, indicating that the values are now encrypted using application-bound encryption.

> [STEALC](https://malpedia.caad.fkie.fraunhofer.de/details/win.stealc) was introduced in 2023 and was developed with “heavy inspiration” from other more established stealers such as [RACOON](https://malpedia.caad.fkie.fraunhofer.de/details/win.raccoon) and [VIDAR](https://malpedia.caad.fkie.fraunhofer.de/details/win.vidar). STEALC and VIDAR have continued concurrent development, and in the case of App-Bound Encryption bypasses have settled on the same implementation.

During the extraction of encrypted data from the databases the malware checks for this prefix. If it begins with ```v20```, a child process is spawned using the embedded PE file in the ```.data``` section of the binary. This program is responsible for extracting unencrypted cookie values residing in one of Chrome's child processes. 

![Embedded PE file](/assets/images/katz-and-mouse-game/image2.png)

This embedded binary creates a hidden desktop via ```OpenDesktopA``` / ```CreateDesktopA``` then uses ```CreateToolhelp32Snapshot``` to scan and terminate all ```chrome.exe``` processes. A new ```chrome.exe``` process is then started with the new desktop object. Based on the installed version of Chrome, the malware selects a signature pattern for the Chromium feature [CookieMonster](https://www.chromium.org/developers/design-documents/network-stack/cookiemonster/), an internal component used to manage cookies.

![Signature pattern for ```CookieMonster```](/assets/images/katz-and-mouse-game/image38.png)

We used the [signature patterns](https://github.com/Meckazin/ChromeKatz/blob/9152004174e9a0b2d092c70ebc75efbf80fa1098/CookieKatz/Main.cpp#L123) to pivot to existing code developed for an offensive security tool called [ChromeKatz](https://github.com/Meckazin/ChromeKatz). At this time, the patterns have been removed from the ChromeKatz repository and replaced with a new technique. Based on our analysis, the malware author appears to have reimplemented ChromeKatz within STEALC in order to bypass the app-bound encryption protection feature. 

Once the malware identifies a matching signature, it enumerates Chrome’s child processes to check for the presence of the ```--utility-sub-type=network.mojom.NetworkService``` command-line flag. This flag indicates that the process is the network service responsible for handling all internet communication. It becomes a prime target as it holds the sensitive data the attacker seeks, as described in MDSec’s [post](https://www.mdsec.co.uk/2021/01/breaking-the-browser-a-tale-of-ipc-credentials-and-backdoors/). It then returns a handle for that specific child process. 

![Enumerating for Chrome’s network service](/assets/images/katz-and-mouse-game/image37.png)

Next, it enumerates each module in the network service child process to find and retrieve the base address and size of ```chrome.dll``` loaded into memory. STEALC uses [```CredentialKatz::FindDllPattern```](https://github.com/Meckazin/ChromeKatz/blob/767047dcf8f53c70be5e3e0859c5eee3f129d758/CredentialKatz/Memory.cpp#L280) and [```CookieKatz::FindPattern```](https://github.com/Meckazin/ChromeKatz/blob/767047dcf8f53c70be5e3e0859c5eee3f129d758/CookieKatz/Memory.cpp#L435) to locate the CookieMonster instances. There are 2 calls to ```CredentialKatz::FindDllPattern```.

![Calls to ```CredentialKatz::FindDllPattern```](/assets/images/katz-and-mouse-game/image17.png)

In the first call to ```CredentialKatz::FindDllPattern```, it tries to locate one of the signature patterns (depending on the victim’s Chrome version) in ```chrome.dll```. Once found, STEALC now has a reference pointer to that memory location where the byte sequence begins which is the function ```net::CookieMonster::~CookieMonster```, destructor of the ```CookieMonster``` class.

![Byte sequence for ```net::CookieMonster::~CookieMonster``` found in ```chrome.dll```](/assets/images/katz-and-mouse-game/image14.png)

The second call to ```CredentialKatz::FindDllPattern``` passes in the function address for ```net::CookieMonster::~CookieMonster(void)``` as an argument for the byte sequence search, resulting in STEALC having a pointer to ```CookieMonster```’s Virtual Function Pointer struct.

![```CookieMonster```’s vtable in ```chrome.dll```](/assets/images/katz-and-mouse-game/image19.png)

The following method used by STEALC is again, identical to ChromeKatz, where it locates ```CookieMonster``` instances by scanning memory chunks in the ```chrome.dll``` module for pointers referencing the ```CookieMonster``` vtable. Since the vtable is a constant across all objects of a given class, any ```CookieMonster``` object will have the same vtable pointer. When a match is identified, STEALC treats the memory location as a ```CookieMonster``` instance and stores its address in an array.

![Using ```CookieKatz::FindPattern``` to locate ```CookieMonster``` instances](/assets/images/katz-and-mouse-game/image16.png)

For each identified ```CookieMonster``` instance, STEALC accesses the internal ```CookieMap``` structure located at an offset of ```+0x30```, and which is a binary tree. Each node within this tree contains pointers to ```CanonicalCookieChrome``` structures. ```CanonicalCookieChrome``` structures hold unencrypted cookie data, making it accessible for extraction. STEALC then initiates a tree traversal by passing the first node into a dedicated traversal function.

![Initiating ```CookieMap``` tree traversal for each ```CookieMonster``` instance found](/assets/images/katz-and-mouse-game/image20.png)

For each node, it calls ```ReadProcessMemory``` to access the ```CanonicalCookieChrome``` structure from the target process’s memory, then further processing it in ```jy::GenerateExfilString```. 

![```CookieMap``` traversal subroutine](/assets/images/katz-and-mouse-game/image31.png)

STEALC formats the extracted cookie data by converting the expiration date to UNIX format and verifying the presence of the ```HttpOnly``` and ```Secure``` flags. It then appends details such as the cookie's name, value, domain, path, and the ```HttpOnly``` and ```Secure``` into a final string for exfiltration. [```OptimizedString```](https://github.com/Meckazin/ChromeKatz/blob/9152004174e9a0b2d092c70ebc75efbf80fa1098/CookieKatz/Memory.cpp#L10) structs are used in place of strings, so string values can either be the string itself, or if the string length is greater than 23, it will point to the address storing the string. 

![Constructing string for data exfiltration](/assets/images/katz-and-mouse-game/image23.png)

## METASTEALER

[METASTEALER](https://malpedia.caad.fkie.fraunhofer.de/details/win.metastealer), first observed in 2022, recently upgraded its ability to steal Chrome data, bypassing Google’s latest mitigation efforts. On September 30th, the malware authors announced this update via their Telegram channel, highlighting its enhanced capability to extract sensitive information, including cookies, despite the security changes in Chrome's version ```129+```.

![METASTEALER announcement and translation](/assets/images/katz-and-mouse-game/image26.png)

![source: https://x.com/g0njxa/status/1840761619686568319/](/assets/images/katz-and-mouse-game/image28.png)

The [first sample](https://www.virustotal.com/gui/file/973a9056040af402d6f92f436a287ea164fae09c263f80aba0b8d5366ed9957a) observed in the wild by our team was discovered on September 30th, the same day the authors promoted the update. Despite claims that the malware operates without needing ```Administrator``` privileges, our testing revealed it does require elevated access, as it attempts to impersonate the ```SYSTEM``` token during execution.

![Code comparison between an old and a new version of the family](/assets/images/katz-and-mouse-game/image11.png)

As shown in the screenshots above, the ```get_decryption``` method now includes a new Boolean parameter. This value is set to ```TRUE``` if the encrypted data (cookie) begins with the ```v20``` prefix, indicating that the cookie is encrypted using Chrome's latest encryption method. The updated function retains backward compatibility, still supporting the decryption of cookies from older Chrome versions if present on the infected machine.

The malware then attempts to access the ```Local State``` or ```LocalPrefs.json``` files located in the Chrome profile directory. Both files are JSON formatted and store encryption keys (```encrypted_key```) for older Chrome versions and ```app_bound_encrypted_key``` for newer ones. If the flag is set to ```TRUE```, the malware specifically uses the ```app_bound_encrypted_key``` to decrypt cookies in line with the updated Chrome encryption method.

![```app_bound_encrypted_key``` extracted from Chrome json file](/assets/images/katz-and-mouse-game/image13.png)

In this case, the malware first impersonates the ```SYSTEM``` token using a newly introduced class called ```ContextSwitcher```.

![New class for TOKEN impersonation](/assets/images/katz-and-mouse-game/image35.png)

It then decrypts the key by creating an instance via the COM of the Chrome service responsible for decryption, named ```GoogleChromeElevationService```, using the CLSID ```708860E0-F641-4611-8895-7D867DD3675B```. Once initialized, it invokes the [```DecryptData```](https://github.com/chromium/chromium/blob/225f82f8025e4f93981310fd33daa71dc972bfa9/chrome/elevation_service/elevator.cc#L155) method to decrypt the ```app_bound_encrypted_key``` key which will be used to decrypt the encrypted cookies.

![New class ```ComInvoker``` to invoke methods from ```GoogleChromeElevationService``` service](/assets/images/katz-and-mouse-game/image8.png)

METASTEALER employs a technique similar to the one demonstrated in a [gist](https://gist.github.com/snovvcrash/caded55a318bbefcb6cc9ee30e82f824) shared [on X](https://x.com/snovvcrash/status/1839715912812802162) on September 27th, which may have served as inspiration for the malware authors. Both approaches leverage similar methods to bypass Chrome's encryption mechanisms and extract sensitive data.

## PHEMEDRONE

This [open-source stealer](https://malpedia.caad.fkie.fraunhofer.de/details/win.phemedrone_stealer) caught the world’s attention earlier in the year through its usage of a Windows SmartScreen vulnerability (CVE-2023-36025). While its development is still occurring on Telegram, our team found a recent [release](https://www.virustotal.com/gui/file/1067d27007ea862ddd68e90ef68b6d17fa18f9305c09f72bad04d00102a60b8c) (2.3.2) submitted at the end of September including new cookie grabber functionality for Chrome.

![```README.txt``` within PHEMEDRONE project](/assets/images/katz-and-mouse-game/image10.png)

The malware first enumerates the different profiles within Chrome, then performs a browser check using function (```BrowserHelpers.NewEncryption```) checking for the Chrome browser with a version greater than or equal to ```127```.

![Chrome version verification in PHEMEDRONE](/assets/images/katz-and-mouse-game/image27.png)

If the condition matches, PHEMEDRONE uses a combination of helper functions to extract the cookies.

![High-level functions used cookie extraction in PHEMEDRONE](/assets/images/katz-and-mouse-game/image34.png)

By viewing the ```ChromeDevToolsWrapper``` class and its different functions, we can see that PHEMEDRONE sets up a remote debugging session within Chrome to access the cookies. The default port (```9222```) is used along with window-position set to ```-2400```,```-2400``` which is set off-screen preventing any visible window from alerting the victim.

![New Chrome process in remote debug mode](/assets/images/katz-and-mouse-game/image15.png)

Next, the malware establishes a WebSocket connection to Chrome’s debugging interface making a request using deprecated Chrome DevTools Protocol method (```Network.getAllCookies```). 

![Chrome DevTools Protocol used to retrieve cookies](/assets/images/katz-and-mouse-game/image24.png)

The cookies are then returned from the previous request in plaintext, below is a network capture showing this behavior:

![Cookie data within network capture](/assets/images/katz-and-mouse-game/image32.png)

## XENOSTEALER

[XENOSTEALER](https://github.com/moom825/XenoStealer/) is an open-source infostealer hosted on GitHub. It appeared in July 2024 and is under active development at the time of this publication. Notably, the Chrome bypass feature was committed on September 26, 2024.

The approach taken by XENOSTEALER is similar to that of METASTEALER. It first parses the JSON file under a given Chrome profile to extract the ```app_bound_encrypted_key```. However, the decryption process occurs within a Chrome process. To achieve this, XENOSTEALER launches an instance of ```Chrome.exe```, then injects code using a helper class called [```SharpInjector```](https://github.com/moom825/XenoStealer/blob/d1c7e242183a2c8582c179a1b546f0a5cdff5f75/XenoStealer/Injector/SharpInjector.cs), passing the encrypted key as a parameter.

The injected code subsequently calls the ```DecryptData``` method from the ```GoogleChromeElevationService``` to obtain the decrypted key.

![Source code of the injected code](/assets/images/katz-and-mouse-game/image29.png) 

## LUMMA

In mid-October, the latest version of [LUMMA](https://malpedia.caad.fkie.fraunhofer.de/details/win.lumma) implemented a new method to bypass Chrome cookie protection, as reported by [@g0njxa](https://x.com/g0njxa).

![](/assets/images/katz-and-mouse-game/image40.png)

We analyzed a recent version of LUMMA, confirming that it managed to successfully recover the cookie data from the latest version of Google Chrome (```130.0.6723.70```). LUMMA first creates a visible Chrome process via ```Kernel32!CreateProcessW```.

![Dump of ```CreateProcessW lpApplicationName``` parameter](/assets/images/katz-and-mouse-game/image3.png)

This activity was followed up in the debugger with multiple calls to ```NtReadVirtualMemory``` where we identified LUMMA searching within the Chrome process for ```chrome.dll```.

![LUMMA seeks ```chrome.dll``` in Chrome](/assets/images/katz-and-mouse-game/image7.png)

Once found, the malware copies the ```chrome.dll``` image to its own process memory using ```NtReadVirtualMemory```. In a similar fashion to the ChromeKatz technique, Lumma leverages pattern scanning to target Chrome’s ```CookieMonster``` component. 

![Lumma’s pattern scanning](/assets/images/katz-and-mouse-game/image36.png)

Lumma uses an obfuscated signature pattern to pinpoint the ```CookieMonster``` functionality:

```
3Rf5Zn7oFA2a????k4fAsdxx????l8xX5vJnm47AUJ8uXUv2bA0s34S6AfFA????kdamAY3?PdE????6G????L8v6D8MJ4uq????k70a?oAj7a3????????K3smA????maSd?3l4
```

Below is the YARA rule after de-obfuscation:

```
rule lumma_stealer
{
  meta:
    author = "Elastic Security Labs"
  strings:
    $lumma_pattern = { 56 57 48 83 EC 28 89 D7 48 89 CE E8 ?? ?? ?? ?? 85 FF 74 08 48 89 F1 E8 ?? ?? ?? ?? 48 89 F0 48 83 C4 28 5F 5E C3 CC CC CC CC CC CC CC CC CC CC 56 57 48 83 EC 38 48 89 CE 48 8B 05 ?? ?? ?? ?? 48 31 E0 48 89 44 24 ?? 48 8D 79 ?? ?? ?? ?? 28 E8 ?? ?? ?? ?? 48 8B 46 20 48 8B 4E 28 48 8B 96 ?? ?? ?? ?? 4C 8D 44 24 ?? 49 89 10 48 C7 86 ?? ?? ?? ?? ?? ?? ?? ?? 48 89 FA FF 15 ?? ?? ?? ?? 48 8B 4C 24 ?? 48 31 E1}
  condition:
    all of them
}
```

After decoding and searching for the pattern in ```chrome.dll```, this leads to the ```CookieMonster``` destructor ([```net::CookieMonster::~CookieMonster```](https://chromium.googlesource.com/chromium/src/net/+/master/cookies/cookie_monster.cc#657)).

![Lumma pattern match on ```CookieMonster```](/assets/images/katz-and-mouse-game/image25.png)

The cookies are then identified in memory and dumped out in clear text from the Chrome process.

![LUMMA dumping the cookie in clear text from Chrome](/assets/images/katz-and-mouse-game/image21.png)

Once completed, LUMMA sends out the cookies along with the other requested data as multiple zip files (xor encrypted and base64 encoded) to the C2 server.

![Received stolen cookies on the C2 side](/assets/images/katz-and-mouse-game/image12.png)

# Detection

Below are the following behavioral detections that can be used to identify techniques used by information stealers: 

 - [Web Browser Credential Access via Unusual Process](https://github.com/elastic/protections-artifacts/blob/da25aa57994ee265583227dbe6fe02261b65415c/behavior/rules/windows/credential_access_web_browser_credential_access_via_unusual_process.toml#L8)
 - [Web Browser Credential Access via Unsigned Process](https://github.com/elastic/protections-artifacts/blob/da25aa57994ee265583227dbe6fe02261b65415c/behavior/rules/windows/credential_access_web_browser_credential_access_via_unsigned_process.toml#L8)
 - [Access to Browser Credentials from Suspicious Memory](https://github.com/elastic/protections-artifacts/blob/da25aa57994ee265583227dbe6fe02261b65415c/behavior/rules/windows/credential_access_access_to_browser_credentials_from_suspicious_memory.toml#L8)
 - [Failed Access Attempt to Web Browser Files](https://github.com/elastic/protections-artifacts/blob/da25aa57994ee265583227dbe6fe02261b65415c/behavior/rules/windows/credential_access_failed_access_attempt_to_web_browser_files.toml#L8)
 - [Browser Debugging from Unusual Parent](https://github.com/elastic/protections-artifacts/blob/da25aa57994ee265583227dbe6fe02261b65415c/behavior/rules/windows/credential_access_browser_debugging_from_unusual_parent.toml#L3)
 - [Potential Browser Information Discovery](https://github.com/elastic/protections-artifacts/blob/da25aa57994ee265583227dbe6fe02261b65415c/behavior/rules/windows/discovery_potential_browser_information_discovery.toml#L8)

Additionally, the following queries can be used for hunting diverse related abnormal behaviors: 

## Cookies access by an unusual process

This query uses file open events and aggregate accesses by process, then looks for ones that are observed in unique hosts and with a low total access count:

``` sql
FROM logs-endpoint.events.file-default*
| where event.category == "file" and event.action == "open" and file.name == "Cookies" and file.path like "*Chrome*"
| keep file.path, process.executable, agent.id
| eval process_path = replace(to_lower(process.executable), """c:\\users\\[a-zA-Z0-9\.\-\_\$]+\\""", "c:\\\\users\\\\user\\\\")
| stats agents_count = COUNT_DISTINCT(agent.id), access_count= count(*) by process_path
| where agents_count <= 2 and access_count <=2
```

Below example of matches from diverse information stealers including the updated ones with new Chrome cookies stealing capabilities: 

![ES|QL query results for suspicious browser cookies file access](/assets/images/katz-and-mouse-game/image22.png)

METASTEALER behavior tends to first terminate all running chrome instances then calls [```CoCreateInstance```](https://learn.microsoft.com/en-us/windows/win32/api/combaseapi/nf-combaseapi-cocreateinstance) to instantiate the Google Chrome [elevation service](https://chromium.googlesource.com/chromium/src/+/main/chrome/elevation_service/), this series of events can be expressed with the following EQL query: 

``` sql
sequence by host.id with maxspan=1s
[process where event.action == "end" and process.name == "chrome.exe"] with runs=5
[process where event.action == "start" and process.name == "elevation_service.exe"]
```

![EQL query results for suspicious browser termination](/assets/images/katz-and-mouse-game/image4.png)

The previous hunt indicates suspicious agents but doesn't identify the source process. By [enabling registry object access auditing through event 4663](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4663) on the Chrome Elevation service CLSID registry key ```{708860E0-F641-4611-8895-7D867DD3675B}```, we can detect unusual processes attempting to access that key: 

![Google Chrome Elevation COM registry access](/assets/images/katz-and-mouse-game/image9.png)

``` sql
FROM logs-system.security-default* | where event.code == "4663" and winlog.event_data.ObjectName == "\\REGISTRY\\MACHINE\\SOFTWARE\\Classes\\CLSID\\{708860E0-F641-4611-8895-7D867DD3675B}" and not winlog.event_data.ProcessName in ("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe") and not winlog.event_data.ProcessName like "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\*\\\\elevation_service.exe" | stats agents_count = COUNT_DISTINCT(agent.id), access_count= count(*) by winlog.event_data.ProcessName | where agents_count <= 2 and access_count <=2
```

Below is an example of matches on the METASTEALER malware while calling ```CoCreateInstance (CLSID_Elevator)```: 

![ES|QL query results for suspicious access to chrome elevation service registry](/assets/images/katz-and-mouse-game/image39.png)

The [PHEMEDRONE](https://malpedia.caad.fkie.fraunhofer.de/details/win.phemedrone_stealer) stealer uses the [known](https://posts.specterops.io/hands-in-the-cookie-jar-dumping-cookies-with-chromiums-remote-debugger-port-34c4f468844e) browser debugging method to collect cookies via Chromium API, this can be observed in the following screenshot where we can see an instance of NodeJs communicating with a browser instance with debugging enabled over port ```9222```:

![PHEMEDRONE - network connection to chrome over port ```9222```](/assets/images/katz-and-mouse-game/image33.png)

The following EQL query can be used to look for unusual processes performing similar behavior: 

``` sql
sequence by host.id, destination.port with maxspan=5s
[network where event.action == "disconnect_received" and
 network.direction == "ingress" and
 process.executable in~ ("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe") and
 source.address like "127.*" and destination.address like "127.*"]
[network where event.action == "disconnect_received" and network.direction == "egress" and not
 process.executable in~ ("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe") and source.address like "127.*" and destination.address like "127.*"]
```

![EQL query results for browser debugging activity](/assets/images/katz-and-mouse-game/image1.png)

## Chrome Browser Spawned from an Unusual Parent

The STEALC sample that uses ChromeKatz implementation spawns an instance of Google Chrome to load the user default profile, while looking for normal parent executables, it turns out it’s limited to Chrome signed parents and Explorer.exe, the following ES|QL query can be used to find unusual parents: 

``` sql
FROM logs-endpoint.events.process-*
| where event.category == "process" and event.type == "start" and to_lower(process.name) == "chrome.exe" and process.command_line like  "*--profile-directory=Default*"
| eval process_parent_path = replace(to_lower(process.parent.executable), """c:\\users\\[a-zA-Z0-9\.\-\_\$]+\\""", "c:\\\\users\\\\user\\\\")
| stats agents_count = COUNT_DISTINCT(agent.id), total_executions = count(*) by process_parent_path
| where agents_count == 1 and total_executions <= 10
```

![ES|QL query results for chrome browser spawned from an unusual parent](/assets/images/katz-and-mouse-game/image18.png)

## Untrusted Binaries from Chrome Application folder

Since the Chrome elevation service [trusts](https://github.com/chromium/chromium/blob/main/chrome/elevation_service/caller_validation.cc#L33-L56) binaries running from the Chrome ```program files``` folder, the following queries can be used to hunt for unsigned or untrusted binaries executed or loaded from there: 

### Unsigned DLLs loaded from google chrome application folder

``` sql
FROM logs-endpoint.events.library*
| where event.category == "library" and event.action == "load" and to_lower(dll.path) like "c:\\\\program files\\\\google\\\\chrome\\\\application\\\\*" and not (dll.code_signature.trusted == true)
| keep process.executable, dll.path, dll.hash.sha256, agent.id
| stats agents_count = COUNT_DISTINCT(agent.id), total_executions = count(*) by process.executable, dll.path, dll.hash.sha256
| where agents_count == 1 and total_executions <= 10
```

### Unsigned executable launched from google chrome application folder

``` sql
FROM logs-endpoint.events.process*
| where event.category == "library" and event.type == "start" and (to_lower(process.executable) like "c:\\\\program files\\\\google\\\\chrome\\\\application\\\\*" or to_lower(process.executable) like "c:\\\\scoped_dir\\\\program files\\\\google\\\\chrome\\\\application\\\\*")
and not (process.code_signature.trusted == true and process.code_signature.subject_name == "Goole LLC")
| keep process.executable,process.hash.sha256, agent.id
| stats agents_count = COUNT_DISTINCT(agent.id), total_executions = count(*) by process.executable, process.hash.sha256
| where agents_count == 1 and total_executions <= 10
```

![ES|QL query results for malicious DLL loaded by Chrome](/assets/images/katz-and-mouse-game/image6.png)

# Conclusion

Google has raised the bar implementing new security controls to protect cookie data within Chrome. As expected, this has caused malware developers to develop or integrate their own bypasses. We hope Google will continue to innovate to provide stronger protection for user data. 

Organizations and defenders should consistently monitor for unusual endpoint activity. While these new techniques may be successful, they are also noisy and detectable with the right security instrumentation, processes, and personnel.  

## Stealer Bypasses and MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that threats use against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

 - [Credential Access](https://attack.mitre.org/tactics/TA0006/)
 - [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
 - [Discovery](https://attack.mitre.org/tactics/TA0007/)
 - [Execution](https://attack.mitre.org/tactics/TA0002/)

### Techniques

Techniques represent how an adversary achieves a tactical goal by performing an action.

 - [Steal Web Session Cookie](https://attack.mitre.org/techniques/T1539/)
 - [Process Injection](https://attack.mitre.org/techniques/T1055/)
 - [Credentials from Password Stores](https://attack.mitre.org/techniques/T1555/)
 - [System Information Discovery](https://attack.mitre.org/techniques/T1082/)
 - [Process Discovery](https://attack.mitre.org/techniques/T1057/)
 - [Inter-Process Communication: Component Object Model](https://attack.mitre.org/techniques/T1559/001/)

## YARA

Elastic Security has created YARA rules to identify this activity. 

 - [Windows.Trojan.Stealc](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Stealc.yar)
 - [Windows.Infostealer.PhemedroneStealer](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Infostealer_PhemedroneStealer.yar)
 - [Windows.Trojan.MetaStealer](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_MetaStealer.yar)
 - [Windows.Trojan.Xeno](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Xeno.yar)
 - [Windows.Trojan.Lumma](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Lumma.yar)
 - [Windows.Infostealer.Generic](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Infostealer_Generic.yar)

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/app-bound_bypass) in both ECS and STIX format.

The following observables were discussed in this research.

| Observable | Type | Name | Reference |
|-----|-----|-----|-----|
| 27e4a3627d7df2b22189dd4bebc559ae1986d49a8f4e35980b428fadb66cf23d | SHA-256 | num.exe | STEALC |
| 08d9d4e6489dc5b05a6caa434fc36ad6c1bd8c8eb08888f61cbed094eac6cb37 | SHA-256 | HardCoreCrack.exe | PHEMEDRONE |
| 43cb70d31daa43d24e5b063f4309281753176698ad2aba9c557d80cf710f9b1d | SHA-256 | Ranginess.exe | METASTEALER |
| 84033def9ffa70c7b77ce9a7f6008600c0145c28fe5ea0e56dfafd8474fb8176 | SHA-256 | | LUMMA |
| b74733d68e95220ab0630a68ddf973b0c959fd421628e639c1b91e465ba9299b | SHA-256 | XenoStealer.exe | XENOSTEALER |


## References
The following were referenced throughout the above research:

 - [https://developer.chrome.com/release-notes/127](https://developer.chrome.com/release-notes/127)
- [https://security.googleblog.com/2024/07/improving-security-of-chrome-cookies-on.html](https://security.googleblog.com/2024/07/improving-security-of-chrome-cookies-on.html)
