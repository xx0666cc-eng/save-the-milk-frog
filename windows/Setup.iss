#ifndef GameRoot
  #error Pass the game directory with /DGameRoot
#endif
#define GameName "拯救奶村"
#define GameVersion "1.0.1"

[Setup]
AppId={{C57AE920-6678-48D2-8E0C-112DFE3B17AA}
AppName={#GameName}
AppVersion={#GameVersion}
VersionInfoVersion={#GameVersion}.0
VersionInfoDescription={#GameName} 安装程序
DefaultDirName={localappdata}\Programs\RiftStrike
DefaultGroupName={#GameName}
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\Game.ico
PrivilegesRequired=lowest
MinVersion=10.0.17763
ArchitecturesAllowed=x64os
ArchitecturesInstallIn64BitMode=x64os
SetupIconFile={#GameIcon}
OutputBaseFilename={#OutputName}
WizardStyle=modern
#ifdef PackedGame
Compression=lzma2/ultra
#else
Compression=lzma2/fast
#endif
SolidCompression=yes
CloseApplications=yes

[Languages]
Name: "chinesesimp"; MessagesFile: "{#ChineseMessages}"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"

[Files]
Source: "{#DesktopRuntime}\electron.exe"; DestDir: "{app}"; DestName: "RiftStrike.exe"; Flags: ignoreversion
Source: "{#DesktopRuntime}\*"; DestDir: "{app}"; Excludes: "\electron.exe,\resources\default_app.asar"; Flags: ignoreversion recursesubdirs
Source: "{#GameIcon}"; DestDir: "{app}"; DestName: "Game.ico"; Flags: ignoreversion
Source: "{#GameRoot}\windows\desktop.js"; DestDir: "{app}\resources\app"; Flags: ignoreversion
Source: "{#GameRoot}\windows\package.json"; DestDir: "{app}\resources\app"; Flags: ignoreversion
#ifdef PackedGame
Source: "{#PackedGame}\*"; DestDir: "{app}\resources\game"; Flags: ignoreversion recursesubdirs solidbreak
#else
Source: "{#GameRoot}\index.html"; DestDir: "{app}\resources\game"; Flags: ignoreversion solidbreak
Source: "{#GameRoot}\*.js"; DestDir: "{app}\resources\game"; Flags: ignoreversion
Source: "{#GameRoot}\*.css"; DestDir: "{app}\resources\game"; Flags: ignoreversion
Source: "{#GameRoot}\vendor\*"; DestDir: "{app}\resources\game\vendor"; Flags: ignoreversion recursesubdirs
Source: "{#GameRoot}\assets\*"; DestDir: "{app}\resources\game\assets"; Excludes: "*.md,\outfits\outfit-2\*,\outfits\outfit-3\*,\outfits\outfit-5\*,\outfits\outfit-6\*,\outfits\outfit-7\*,\outfits\outfit-10\*"; Flags: ignoreversion recursesubdirs
#endif

[Icons]
Name: "{group}\{#GameName}"; Filename: "{app}\RiftStrike.exe"; WorkingDir: "{app}"; IconFilename: "{app}\Game.ico"; AppUserModelID: "RiftStrike.Game"
Name: "{userdesktop}\{#GameName}"; Filename: "{app}\RiftStrike.exe"; WorkingDir: "{app}"; IconFilename: "{app}\Game.ico"; AppUserModelID: "RiftStrike.Game"; Tasks: desktopicon

[Run]
Filename: "{app}\RiftStrike.exe"; WorkingDir: "{app}"; Description: "启动拯救奶村"; Flags: nowait postinstall skipifsilent

