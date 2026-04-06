; ─────────────────────────────────────────────────────────────────────────────
;  Tatum Telemetry Client — Inno Setup 6 Script
;  Build: iscc TatumClient.iss
; ─────────────────────────────────────────────────────────────────────────────

#define AppName    "Tatum Telemetry Client"
#define AppVersion "0.3.1"
#define AppPublisher "Tatum Res-Tech"
#define AppURL     "https://tatumtelemetry.it"
#define AppExe     "TatumClient.exe"
#define AppMutex   "TatumTelemetryClientMutex"

[Setup]
AppId                    = {{A3F1B2C4-7E8D-4F5A-9B0C-1D2E3F4A5B6C}
AppName                  = {#AppName}
AppVersion               = {#AppVersion}
AppPublisherURL          = {#AppURL}
AppSupportURL            = {#AppURL}
AppPublisher             = {#AppPublisher}
DefaultDirName           = {autopf}\TatumTelemetry
DefaultGroupName         = Tatum Telemetry
OutputDir                = dist
OutputBaseFilename       = TatumClientSetup
SetupIconFile            = icons\icon.ico
UninstallDisplayIcon     = {app}\{#AppExe}
Compression              = lzma2/ultra64
SolidCompression         = yes
; Closes the running client before install/uninstall
CloseApplications        = yes
AppMutex                 = {#AppMutex}
; No elevation needed — installa per-user senza UAC
PrivilegesRequired            = lowest
PrivilegesRequiredOverridesAllowed = commandline dialog
WizardStyle              = modern
; Show the license/welcome page
DisableWelcomePage       = no
; Min Windows version: Windows 10
MinVersion               = 10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "italian"; MessagesFile: "compiler:Languages\Italian.isl"

[Tasks]
Name: "desktopicon";    Description: "Crea un'icona sul Desktop"; GroupDescription: "Icone aggiuntive:";
Name: "startupentry";   Description: "Avvia automaticamente con Windows";    GroupDescription: "Opzioni di avvio:"

[Files]
Source: "dist\{#AppExe}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}";          Filename: "{app}\{#AppExe}"
Name: "{group}\Disinstalla";         Filename: "{uninstallexe}"
Name: "{commondesktop}\{#AppName}";  Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Registry]
; Autostart per l'utente corrente (non richiede admin)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
    ValueType: string; ValueName: "TatumTelemetryClient"; \
    ValueData: """{app}\{#AppExe}"""; \
    Flags: uninsdeletevalue; Tasks: startupentry

; Custom URL protocol: tatum:// → apre/avvia il client dalla dashboard
Root: HKCU; Subkey: "Software\Classes\tatum";                          ValueType: string; ValueName: "";            ValueData: "Tatum Telemetry Client";    Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\tatum";                          ValueType: string; ValueName: "URL Protocol"; ValueData: "";                         Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\tatum\DefaultIcon";              ValueType: string; ValueName: "";            ValueData: """{app}\{#AppExe}"",0";     Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\tatum\shell\open\command";       ValueType: string; ValueName: "";            ValueData: """{app}\{#AppExe}"" ""%1"""; Flags: uninsdeletekey

[Run]
; Avvia il client subito dopo l'installazione (nascosto, va in system tray)
Filename: "{app}\{#AppExe}"; \
    Description: "Avvia {#AppName}"; \
    Flags: nowait postinstall skipifsilent

[UninstallRun]
; Chiudi il client prima di disinstallare
Filename: "taskkill"; Parameters: "/F /IM {#AppExe}"; Flags: runhidden; RunOnceId: "KillClient"
