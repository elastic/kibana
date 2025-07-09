---
title: "未公開のカーネルデータ構造を使ったホットキー型キーロガーの検知"
slug: "detecting-hotkey-based-keyloggers-jp"
date: "2025-02-04"
description: "本記事では、ホットキー型キーロガーとは何かについてと、その検知方法について紹介します。具体的には、ホットキー型キーロガーがどのようにしてキー入力を盗み取るのかを解説した後、カーネルレベルに存在する未公開(Undocumented)のホットキーテーブルを活用した検知手法について説明します。"
author:
- slug: asuka-nakajima
image: "Security Labs Images 12.jpg"
category:
  - slug: security-research
  - slug: detection-science
tags:
  - detection engineering
  - threat detection
---

## 未公開のカーネルデータ構造を使った
## ホットキー型キーロガーの検知  

 本記事では、ホットキー型キーロガーとは何かについてと、その検知方法について紹介します。具体的には、ホットキー型キーロガーがどのようにしてキー入力を盗み取るのかを解説した後、カーネルレベルに存在する未公開(Undocumented)のホットキーテーブルを活用した検知手法について説明します。

## はじめに

　Elastic Security Labsでは2024年5月、[Elastic Defend](https://www.elastic.co/guide/en/integrations/current/endpoint.html)のバージョン 8.12 より追加された、Windows上で動作するキーロガーの検知を強化する新機能を紹介する[記事](https://www.elastic.co/security-labs/protecting-your-devices-from-information-theft-keylogger-protection-jp)を公開しました 。具体的には、サイバー攻撃で一般的に使われる4種類のキーロガー(ポーリング型キーロガー、フッキング型キーロガー、Raw Input Modelを用いたキーロガー、DirectInputを用いたキーロガー)を挙げ、それらに対する私たちが提供した検知手法についてを解説しました。具体的には[Event Tracing for Windows](https://learn.microsoft.com/ja-jp/windows-hardware/drivers/devtest/event-tracing-for-windows--etw-) (ETW)における、Microsoft-Windows-Win32kプロバイダを用いた振る舞い検知の方法についてを紹介しました。  
　記事公開後、大変光栄なことに記事がMicrosoft社のPrincipal Security Researcherである[Jonathan Bar Or](https://jonathanbaror.com/)氏の目に留まり、「ホットキー型キーロガーもある」といった貴重なご意見とともに、そのPoCコードも公開してくださりました。そこで本記事では、氏が公開したホットキー型キーロガーのPoCコードである「[Hotkeyz](https://github.com/yo-yo-yo-jbo/hotkeyz)」 をもとに、本キーロガーの検知手法の一案についてを述べたいと思います。

## ホットキー型キーロガーの概要

### そもそもホットキーとは何か？

　ホットキー型キーロガーについて説明する前に、まずホットキーとは何かを解説します。ホットキーとは、キーボードショートカットの一種であり、コンピュータにおいて、特定の機能を直接呼び出して実行させるキーまたはキーの組み合わせのことを指します。例えばWindowsにおいてタスク(ウィンドウ)を切り替える際に「**Alt \+ Tab**」を押している人も多いかと思います。この時使っているこの「**Alt \+ Tab**」が、タスク切り替え機能を直接呼び出す「ホットキー」にあたります。

*(注: ホットキー以外にも、キーボードショートカットは存在しますが、本記事ではそれらは対象外です。また本記事に記載の事項はすべて、筆者が検証に利用した環境である、仮想化ベースのセキュリティが動作していないWindows 10 version 22H2 OS Build 19045.5371が前提になります。他のWindowsのバージョンではまた内部の構造や挙動が違う場合があること、ご注意ください。)*

### 任意のホットキーが登録できることを悪用する

　先ほどの例のようにWindowsで予め設定されたホットキーを使う以外にも、実は自分で任意のホットキーを登録することも可能です。登録方法は様々ありますが、[RegisterHotKey](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-registerhotkey)というWindows APIを使えば、指定のキーをホットキーとして登録することができます。例えば、以下が`RegisterHotKey` APIを使って「A」([virtual-key code](https://learn.microsoft.com/ja-jp/windows/win32/inputdev/virtual-key-codes)で0x41)キーを、グローバルなホットキーとして登録するためのコードの例です。

```c
/*
BOOL RegisterHotKey(
  [in, optional] HWND hWnd, 
  [in]           int  id,
  [in]           UINT fsModifiers,
  [in]           UINT vk
);
*/
RegisterHotKey(NULL, 1, 0, 0x41);
```

　ホットキーとして登録後、登録されたキーが押下された場合、`RegisterHotKey` APIの第一引数で指定したウィンドウ(NULLの場合はホットキー登録時のスレッド)の[メッセージキュー](https://learn.microsoft.com/ja-jp/windows/win32/winmsg/about-messages-and-message-queues)に、[WM\_HOTKEYメッセージ](https://learn.microsoft.com/ja-jp/windows/win32/inputdev/wm-hotkey)が届くようになります。以下は実際に、メッセージキューにWM\_HOTKEY メッセージが来ていないかを[GetMessage](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-getmessage) APIを使って確認し、届いていた場合、WM\_HOTKEYメッセージに内包されていた virtual-key code(今回の場合「0x41」)を取り出しているコード(メッセージループ)になります。

```c
MSG msg = { 0 };
while (GetMessage(&msg, NULL, 0, 0)) {
    if (msg.message == WM_HOTKEY) {
        int vkCode = HIWORD(msg.lParam);
        std::cout << "WM_HOTKEY received! Virtual-Key Code: 0x"
            << std::hex << vkCode << std::dec << std::endl;
    }
}
```

 　これは言い換えると、例えばメモ帳アプリに文章を書く際、Aキーから入力された文字は、文字としての入力ではなく、グローバルなホットキーとして認識されることになります。

　今回は「A」のみをホットキーとして登録しましたが、複数のキー(BやCやD)を同時に個々のホットキーとして登録することも可能です。これはつまり、`RegisterHotKey` APIでホットキーとして登録可能な範囲の任意のキー(virtual-key code)の入力は、すべてグローバルなホットキーとして横取りすることも可能であるということです。そしてホットキー型キーロガーはこの性質を悪用して、ユーザから入力されたキーを盗み取ります。  
　筆者が手元の環境で試した限りは、英数字と基本的な記号キーだけでなく、それらにSHIFT修飾子をつけたすべてキーが`RegisterHotKey` APIでホットキーとして登録可能でした。そのため、キーロガーとして問題なく、情報の窃取に必要なキーの監視ができると言えるでしょう。

### 密かにキーを盗み取る

　ホットキー型キーロガーがキーを盗み取る実際の流れについてを、Hotkeyzを例に紹介します。  
Hotkeyzでは最初に、各英数字キーに加えて、一部のキー(VK\_SPACEやVK\_RETURNなど)のvirtual-key codeを、`RegisterHotKey` APIを使い個々のホットキーとして登録します。その後キーロガー内のメッセージループにて、登録されたホットキーのWM\_HOTKEYメッセージが、メッセージキューに到着していないかを[PeekMessageW](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-peekmessagew) APIを使って確認します。そしてWM\_HOTKEYメッセージが来ていた場合、メッセージに内包されているvirtual-key codeを取り出して、最終的にはそれをテキストファイルに保存します。以下がメッセージループ内のコードのコードです。特に重要な部分を抜粋して掲載しています。

```c
while (...)
{
    // Get the message in a non-blocking manner and poll if necessary
    if (!PeekMessageW(&tMsg, NULL, WM_HOTKEY, WM_HOTKEY, PM_REMOVE))
    {
        Sleep(POLL_TIME_MILLIS);
        continue;
    }
....
   // Get the key from the message
   cCurrVk = (BYTE)((((DWORD)tMsg.lParam) & 0xFFFF0000) >> 16);

   // Send the key to the OS and re-register
   (VOID)UnregisterHotKey(NULL, adwVkToIdMapping[cCurrVk]);
   keybd_event(cCurrVk, 0, 0, (ULONG_PTR)NULL);
   if (!RegisterHotKey(NULL, adwVkToIdMapping[cCurrVk], 0, cCurrVk))
   {
       adwVkToIdMapping[cCurrVk] = 0;
       DEBUG_MSG(L"RegisterHotKey() failed for re-registration (cCurrVk=%lu,    LastError=%lu).", cCurrVk, GetLastError());
       goto lblCleanup;
   }
   // Write to the file
  if (!WriteFile(hFile, &cCurrVk, sizeof(cCurrVk), &cbBytesWritten, NULL))
  {
....
```

　ここで特筆するべき点としては、ユーザにキーロガーの存在を気取られないため、メッセージからvirtual-key codeを取り出した時点で、いったんそのキーのホットキー登録を[UnregisterHotKey](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-unregisterhotkey) APIを使って解除し、その上で[keybd\_event](https://learn.microsoft.com/ja-jp/windows/win32/api/winuser/nf-winuser-keybd_event)を使ってキーを送信することです。これにより、ユーザからは問題無くキーが入力出来ているように見え、キーが裏で窃取されていることに気が付かれにくくなります。そしてキーを送信した後は再びそのキーを`RegisterHotKey` APIを使ってホットキーとして登録し、再びユーザからの入力を待ちます。以上が、ホットキー型キーロガーの仕組みです。

## **ホットキー型キーロガーの検知手法**

　ホットキー型キーロガーとは何かやその仕組みについて理解したところで、次にこれをどのように検知するかについてを説明します。

### ETWではRegisterHotKey APIは監視していない

　以前の記事で書いた方法と同様に、まずはホットキー型キーロガーも[Event Tracing for Windows](https://learn.microsoft.com/ja-jp/windows/win32/etw/about-event-tracing) (ETW) を利用して検知が出来ないかを検討・調査しました。その結果、ETWでは`RegisterHotKey` APIや`UnRegisterHotKey` APIを監視していないことがすぐに判明しました。Microsoft-Windows-Win32k プロダイバーのマニフェストファイルの調査に加えて、`RegisterHotKey`のAPIの内部(具体的にはwin32kfull.sysにある`NtUserRegisterHotKey`)をリバースエンジニアリングをしたものの、これらのAPIが実行される際、ETWのイベントを送信しているような形跡は残念ながら見つかりませんでした。  
　以下の図は、ETWで監視対象となっている`GetAsyncKeyState`(`NtUserGetAsyncKeyState`)と、`NtUserRegisterHotKey`の逆コンパイル結果を比較したものを示しています。`NtUserGetAsyncKeyState`の方には関数の冒頭に、`EtwTraceGetAsyncKeyState`というETWのイベント書き出しに紐づく関数が存在しますが、`NtUserRegisterHotKey`には存在しないのが見て取れます。

![図1: NtUserGetAsyncKeyStateとNtUserRegisterHotKeyの逆コンパイル結果の比較](/assets/images/detecting-hotkey-based-keyloggers/image3.png)
　  
　Microsoft-Windows-Win32k 以外のETWプロバイダーを使って、間接的に`RegisterHotKey` APIを呼び出しを監視する案もでたものの、次に紹介する、ETWを使わず「ホットキーテーブル」を利用した検知手法が、`RegisterHotKey` APIを監視するのと同様かそれ以上の効果が得られることが分かり、最終的にはこの案を採用することにしました。

### ホットキーテーブル(gphkHashTable)を利用した検知

　ETWでは`RegisterHotKey` APIの呼び出しを直接監視出来ないことが判明した時点で、ETWを利用せずに検知する方法を検討することにしました。検討の最中、「そもそも登録されたホットキーの情報がどこかに保存されているのではないか？」「もし保存されているとしたら、その情報が検知に使えるのではないか？」という考えに至りました。その仮説をもとに調査した結果、すぐに`NtUserRegisterHotkey`内にて`gphkHashTable`というラベルがつけられたハッシュテーブルを発見することが出来ました。Microsoft社が公開しているオンラインのドキュメント類を調査しても`gphkHashTable`についての情報はなかったため、これは未公開(undocumented)のカーネルデータ構造のようです。

![図2: ホットキーテーブルgphkHashTable。NtUserRegisterHotKey内で呼ばれたRegisterHotKey関数内にて発見](/assets/images/detecting-hotkey-based-keyloggers/image1.png)

　リバースエンジニアリングをした結果、このハッシュテーブルは、登録されたホットキーの情報を持つオブジェクトを保存しており、各オブジェクトは`RegisterHotKey` APIの引数にて指定されたvirtual-key codeや修飾子の情報を保持していることが分かりました。以下の図(右)がホットキーのオブジェクト(**HOT\_KEY**と命名)の構造体の定義の一部と、図(左)が実際にwindbg上で`gphkHashTable`にアクセスした上で、登録されたホットキーのオブジェクトを見た時の様子です。

![図3: ホットキーオブジェクトの詳細。Windbg画面(図左)とHOT\_KEY構造体の詳細](/assets/images/detecting-hotkey-based-keyloggers/image4.png)

　リバースエンジニアリングをした結果をまとめると、ghpkHashTableは図4のような構造になっていることがわかりました。具体的には、`RegisterHotKey` APIで指定されたvirtual-key codeに対して0x80の余剰演算をした結果をハッシュテーブルのインデックスにしていました。そして同じインデックスを持つホットキーオブジェクトを連結リストで結ぶことで、virtual-key codeが同じでも、修飾子が違うホットキーの情報も保持・管理出来るようになっています。  

![図4: gphkHashTableの構造](/assets/images/detecting-hotkey-based-keyloggers/image6.png)

　つまり`gphkHashTable`で保持している全てのHOT\_KEYオブジェクトを走査すれば、登録されている全ホットキーの情報が取得できるということになります。取得した結果、主要なキー(例えば単体の英数字キー）全てが個々のホットキーとして登録されていれば、ホットキー型キーロガーが動作していることを示す強い根拠となります。

## 検知ツールを作成する

　では次に、実際に検知ツールの方を実装していきます。`gphkHashTable`自体はカーネル空間に存在するため、ユーザモードのアプリケーションからはアクセス出来ません。そのため検知のために、デバイスドライバを書くことにしました。具体的には`gphkHashTable`のアドレスを取得した後、ハッシュテーブルに保存されている全オブジェクトを走査した上で、ホットキーとして登録されている英数字キーの数が一定数以上ならば、ホットキー型キーロガーが存在する可能性がある事を知らせてくるデバイスドライバを作成することにしました。

### gphkHashTableのアドレスを取得する方法

　検知ツールを作成するにあたり、最初に直面した課題としては「gphkHashTableのアドレスをどのようにして取得すればよいのか？」ということです。悩んだ結果、**win32kfull.sys**のメモリ空間内でgphkHashTableにアクセスしている命令から直接gphkHashTableのアドレスを取得することにしました。  
　リバースエンジニアリングした結果、`IsHotKey`という関数内では、関数の冒頭部分にあるlea命令(lea rbx, gphkHashTable)にて、gphkHashTableのアクセスしていることがわかりました。この命令のオプコードバイト(0x48, 0x8d, 0x1d)部分をシグネチャに該当行を探索して、得られた32bit(4バイト)のオフセットからgphkHashTableのアドレスを算出することにしました。  

![図5: IsHotKey関数内 ](/assets/images/detecting-hotkey-based-keyloggers/image5.png)
 
　加えて、IsHotKey関数自体もエクスポート関数でないため、そのアドレスも何らかの方法で取得しなければいけません。そこでさらなるリバースエンジニアリングの結果、`EditionIsHotKey`というエクスポートされた関数内で、`IsHotKey`関数が呼ばれていることがわかりました。そこでEditionIsHotKey関数から前述と同様の方法で、IsHotKey関数のアドレスを算出することにしました。(補足ですが、**win32kfull.sys**のベースアドレスに関しては`PsLoadedModuleList`というAPIで探せます。)

　## **win32kfull.sys**のメモリ空間にアクセスするには 
 
 　**gphkHashTable**のアドレスを取得する方法について検討が終わったところで、実際に**win32kfull.sys**のメモリ空間にアクセスして、**gphkHashTable**のアドレスを取得するためのコードを書き始めました。この時直面した課題としては、**win32kfull.sys**は「セッションドライバ」であるという点ですが、ここではまず「セッション」とは何かについて、簡単に説明します。  
　Windowsでは一般的にユーザがログインした際、ユーザ毎に個別に「セッション」(1番以降のセッション番号)が割り当てられます。かなり大雑把に説明すると、最初にログインしたユーザには「セッション１」が割り当てられ、その状態で別のユーザがログインした場合今度は「セッション２」が割り当てられます。そして各ユーザは個々のセッション内で、それぞれのデスクトップ環境を持ちます。  
　この時、セッション別(ログインユーザ別)に管理するべきカーネルのデータは、カーネルメモリ内の「セッション空間」というセッション別の分離したメモリ空間で管理され、win32k ドライバが管理しているようなGUIオブジェクト(ウィンドウ、マウス・キーボード入力の情報等)もこれに該当します。これにより、ユーザ間で画面や入力情報が混ざることがないのです。(かなり大まかな説明のため、より詳しくセッションについて知りたい方はJames Forshaw氏の[こちらのブログ記事](https://googleprojectzero.blogspot.com/2016/01/raising-dead.html)を読むことをおすすめします。)  

![図6: セッションの概要。 セッション0はサービスプロセス専用のセッション](/assets/images/detecting-hotkey-based-keyloggers/image2.png)
　　  
以上の背景から、**win32kfull.sys**は「セッションドライバ」と呼ばれています。つまり、例えば最初のログインユーザのセッション(セッション1)内で登録されたホットキーの情報は、同じセッション内からしかアクセスできないということです。ではどうすれば良いのかというと、このような場合、[KeStackAttachProcess](https://learn.microsoft.com/ja-jp/windows-hardware/drivers/ddi/ntifs/nf-ntifs-kestackattachprocess)が利用できることが[知られています](https://eversinc33.com/posts/kernel-mode-keylogging.html)。  
　KeStackAttachProcessは、現在のスレッドを指定のプロセスのアドレス空間に一時的にアタッチすることが出来ます。この時、対象のセッションにいるGUIプロセス、より正確には**win32kfull.sys**をロードしているプロセスにアタッチすることが出来れば、対象セッションの**win32kfull.sys**やそのデータにアクセスすることが出来ます。今回は、ログインユーザが１ユーザであることを仮定して、各ユーザのログオン操作を担うプロセスである**winlogon.exe**を探してアタッチすることにしました。

### 登録されているホットキーを確認する

　**winlogon.exe**のプロセスにアタッチし、**gphkHashTable**のアドレスを特定出来た後は、後は**gphkHashTable**をスキャンして登録されたホットキーを確認するだけです。以下がその抜粋版のコードです。

```c
BOOL CheckRegisteredHotKeys(_In_ const PVOID& gphkHashTableAddr)
{
-[skip]-
    // Cast the gphkHashTable address to an array of pointers.
    PVOID* tableArray = static_cast<PVOID*>(gphkHashTableAddr);
    // Iterate through the hash table entries.
    for (USHORT j = 0; j < 0x80; j++)
    {
        PVOID item = tableArray[j];
        PHOT_KEY hk = reinterpret_cast<PHOT_KEY>(item);
        if (hk)
        {
            CheckHotkeyNode(hk);
        }
    }
-[skip]-
}

VOID CheckHotkeyNode(_In_ const PHOT_KEY& hk)
{
    if (MmIsAddressValid(hk->pNext)) {
        CheckHotkeyNode(hk->pNext);
    }

    // Check whether this is a single numeric hotkey.
    if ((hk->vk >= 0x30) && (hk->vk <= 0x39) && (hk->modifiers1 == 0))
    {
        KdPrint(("[+] hk->id: %u hk->vk: %x\n", hk->id, hk->vk));
        hotkeyCounter++;
    }
    // Check whether this is a single alphabet hotkey.
    else if ((hk->vk >= 0x41) && (hk->vk <= 0x5A) && (hk->modifiers1 == 0))
    {
        KdPrint(("[+] hk->id: %u hk->vk: %x\n", hk->id, hk->vk));
        hotkeyCounter++;
    }
-[skip]-
}
....
if (CheckRegisteredHotKeys(gphkHashTableAddr) && hotkeyCounter >= 36)
{
   detected = TRUE;
   goto Cleanup;
}
```

　コード自体は難しくなく、ハッシュテーブルの各インデックスの先頭から順に、連結リストをたどりながらすべての**HOT\_KEY**オブジェクトにアクセスして、登録されているホットキーが単体の英数字キーか否かを確認しています。作成した検知ツールでは、すべての単体英数字キーがホットキーとして登録  
されていた場合、ホットキー型キーロガーが存在するとしてアラートを挙げます。また、今回実装の簡略化のため、英数字単体キーのホットキーのみを対象としていますが、SHIFTなどの修飾子付きのホットキーも容易に調べることが可能です。

### Hotkeyzを検知する

　検知ツール(Hotkey-based Keylogger Detector)は以下にて公開しました。使い方も以下に記載していますので、興味ある方はぜひご覧ください。加えて本研究は[NULLCON Goa 2025](https://nullcon.net/goa-2025/speaker-windows-keylogger-detection)でも発表しましたので、その[発表スライド](https://docs.google.com/presentation/d/1B0Gdfpo-ER2hPjDbP_NNoGZ8vXP6X1_BN7VZCqUgH8c/edit?usp=sharing)も併せてご覧いただけます。

*[https://github.com/AsuNa-jp/HotkeybasedKeyloggerDetector](https://github.com/AsuNa-jp/HotkeybasedKeyloggerDetector)

　最後に、本ツールを用いて実際にHotkeyzを検知する様子を収録したデモ動画が以下になります。

[DEMO\_VIDEO.mp4](https://drive.google.com/file/d/1koGLqA5cPlhL8C07MLg9VDD9-SW2FM9e/view?usp=drive_link)

## 謝辞

　[前回の記事](https://www.elastic.co/security-labs/protecting-your-devices-from-information-theft-keylogger-protection-jp)を読んで下さり、その上でホットキー型キーロガーの手法について教えてくださり、その上そのPoCとなるHotkeyzを公開してくださった、Jonathan Bar Or氏に心より感謝致します。
