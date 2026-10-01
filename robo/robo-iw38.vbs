' =====================================================================
'  Robo IW38 - Central de Abastecimento
'  1) Exporta a IW38 do SAP (SAP precisa estar ABERTO e LOGADO)
'  2) Salva IW38.xlsx na MESMA PASTA em que este arquivo esta
'  3) Envia para o app, que atualiza e registra "O que mudou"
'
'  Uso: dois cliques. Para rodar sem janelas (Agendador do Windows):
'       wscript.exe robo-iw38.vbs /silencioso
'  Historico de cada execucao: historico.txt (na mesma pasta)
'
'  ATENCAO: este arquivo contem a CHAVE DO ROBO. Nao envie por e-mail
'  nem deixe em pasta compartilhada.
' =====================================================================
Option Explicit

Const URL_APP = "{{URL_APP}}"
Const TOKEN = "{{TOKEN}}"
Const ARQUIVO = "IW38.xlsx"
Const LAYOUT = "/CLAUDINEIA"
Const DATA_DE = "13.09.2021"
Const DATA_ATE = "31.12.2029"
Dim GRUPOS : GRUPOS = Array("5I6", "5I7", "5I8", "5IS", "5I3", "5I5", "8IS", "8IT")

Dim fso, sh, silencioso, caminho, historico, PASTA, PASTAS
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
silencioso = False
If WScript.Arguments.Count > 0 Then silencioso = (LCase(WScript.Arguments(0)) = "/silencioso")
' Tudo (planilha, historico) fica na pasta onde este arquivo esta.
PASTA = fso.GetParentFolderName(WScript.ScriptFullName)
caminho = PASTA & "\" & ARQUIVO
historico = PASTA & "\historico.txt"
' Onde o SAP pode gravar a planilha exportada (normalmente a Area de Trabalho).
PASTAS = Array(sh.SpecialFolders("Desktop"), sh.SpecialFolders("MyDocuments"), _
               sh.ExpandEnvironmentStrings("%USERPROFILE%\Downloads"), _
               sh.ExpandEnvironmentStrings("%USERPROFILE%\Desktop"), _
               sh.ExpandEnvironmentStrings("%USERPROFILE%\Documents\SAP\SAP GUI"), PASTA)

Sub Registrar(msg)
  Dim f
  Set f = fso.OpenTextFile(historico, 8, True)
  f.WriteLine Now & "  " & msg
  f.Close
End Sub

Sub Falhar(msg)
  Registrar "ERRO: " & msg
  If Not silencioso Then MsgBox msg, vbCritical + 4096, "Robo IW38"
  WScript.Quit 1
End Sub

' Procura, nas pastas onde o SAP costuma salvar, o arquivo .xlsx/.xls mais novo
' gravado depois de "desde". Devolve o caminho ou "".
Function AcharMaisNovo(desde)
  On Error Resume Next
  Dim i, arq, ext, melhorData
  AcharMaisNovo = ""
  melhorData = desde
  For i = 0 To UBound(PASTAS)
    If PASTAS(i) <> "" Then
      If fso.FolderExists(PASTAS(i)) Then
        For Each arq In fso.GetFolder(PASTAS(i)).Files
          ext = LCase(fso.GetExtensionName(arq.Name))
          If (ext = "xlsx" Or ext = "xls") And Left(arq.Name, 2) <> "~$" Then
            If arq.DateLastModified >= melhorData Then
              melhorData = arq.DateLastModified
              AcharMaisNovo = arq.Path
            End If
          End If
        Next
      End If
    End If
  Next
End Function

' Resumo dos processos do Excel (vai para o historico, para diagnostico).
Function InfoExcel()
  On Error Resume Next
  Dim wmi, col, p, txt
  Set wmi = GetObject("winmgmts:\\.\root\cimv2")
  Set col = wmi.ExecQuery("Select ProcessId, CommandLine From Win32_Process Where Name = 'EXCEL.EXE'")
  txt = "EXCEL.EXE x" & col.Count
  For Each p In col
    txt = txt & " [pid " & p.ProcessId & ": " & Left(p.CommandLine & "", 80) & "]"
  Next
  InfoExcel = txt
End Function

' Acha, entre os arquivos abertos no Excel, a aba com a lista do SAP
' (cabecalho com a coluna "Ordem" e mais de 100 linhas).
Function AcharAbaSap(xl)
  On Error Resume Next
  Dim wb, ws, c
  Set AcharAbaSap = Nothing
  For Each wb In xl.Workbooks
    For Each ws In wb.Worksheets
      For c = 1 To 40
        If InStr(1, CStr(ws.Cells(1, c).Value), "Ordem", 1) > 0 Then
          If ws.UsedRange.Rows.Count > 100 Then
            Set AcharAbaSap = ws
            Exit Function
          End If
        End If
      Next
    Next
  Next
End Function

' Copia a aba de dados para um arquivo novo (sem a tabela dinamica do SAP) e salva.
Function SalvarAba(xl, aba, destino, ByRef motivo)
  On Error Resume Next
  Dim livroSap, novo
  SalvarAba = False
  Set livroSap = aba.Parent
  xl.DisplayAlerts = False
  Err.Clear
  aba.Copy
  If Err.Number = 0 Then
    Set novo = xl.ActiveWorkbook
    novo.SaveAs destino, 51
    If Err.Number = 0 Then
      novo.Close False
      SalvarAba = True
    Else
      motivo = "falha ao salvar a copia (" & Err.Description & ")"
    End If
  Else
    motivo = "falha ao copiar a aba (" & Err.Description & ")"
    Err.Clear
    livroSap.SaveCopyAs destino
    If Err.Number = 0 Then
      SalvarAba = True
    Else
      motivo = motivo & " / SaveCopyAs: " & Err.Description
    End If
  End If
  If SalvarAba Then
    Err.Clear
    livroSap.Close False
  End If
End Function

' Espera a planilha do SAP e deixa salva em "caminho". Duas vias ao mesmo tempo:
'  (a) um .xlsx novo gravado nas pastas de busca (se o SAP gravar um arquivo);
'  (b) a planilha aberta no Excel (o caso normal: o SAP abre na memoria).
' Para (b) o Excel precisa estar "registrado" no Windows, o que so acontece
' quando a janela dele esta ativa: por isso o AppActivate.
Function EsperarPlanilha(desde, ByRef motivo)
  On Error Resume Next
  Dim t, achado, tamanho, antes, estavel, xl, aba, linhas, antesLinhas, estavelLinhas, ativou
  EsperarPlanilha = False
  antes = -1
  estavel = 0
  antesLinhas = -1
  estavelLinhas = 0
  ativou = "?"
  t = 0
  motivo = "o SAP ainda nao abriu a planilha"
  Registrar "Excel no inicio da espera: " & InfoExcel()
  Do While t < 600
    t = t + 1
    Err.Clear
    If fso.FileExists(caminho) Then
      EsperarPlanilha = True
      Exit Function
    End If

    ' (a) arquivo novo gravado pelo SAP
    achado = AcharMaisNovo(desde)
    If achado <> "" Then
      tamanho = -1
      tamanho = fso.GetFile(achado).Size
      If tamanho > 0 And tamanho = antes Then
        estavel = estavel + 1
      Else
        estavel = 0
        motivo = "gravando " & fso.GetFileName(achado) & " (" & Round(tamanho / 1024) & " KB)"
      End If
      antes = tamanho
      If estavel >= 6 Then
        If CopiarArquivo(achado, caminho) Then
          Registrar "Planilha gravada pelo SAP: " & achado
          EsperarPlanilha = True
          Exit Function
        End If
      End If
    End If

    ' (b) planilha aberta no Excel
    If t Mod 4 = 1 Then ativou = sh.AppActivate("Excel")
    Set xl = Nothing
    Err.Clear
    Set xl = GetObject(, "Excel.Application")
    If Err.Number <> 0 Then
      motivo = "Excel nao acessivel (AppActivate=" & ativou & ", erro " & Hex(Err.Number) & ")"
      Err.Clear
    Else
      Set aba = Nothing
      Set aba = AcharAbaSap(xl)
      If aba Is Nothing Then
        motivo = "Excel acessivel (" & xl.Workbooks.Count & " arquivo(s)), mas sem a lista do SAP ainda"
      Else
        linhas = -1
        linhas = aba.UsedRange.Rows.Count
        If linhas < 0 Then
          motivo = "Excel ocupado"
          estavelLinhas = 0
        ElseIf linhas = antesLinhas Then
          estavelLinhas = estavelLinhas + 1
        Else
          estavelLinhas = 0
          motivo = "SAP ainda preenchendo a planilha (" & linhas & " linhas)"
        End If
        antesLinhas = linhas
        If estavelLinhas >= 3 Then
          If SalvarAba(xl, aba, caminho, motivo) Then
            Registrar "Planilha salva a partir do Excel aberto"
            EsperarPlanilha = True
            Exit Function
          End If
          estavelLinhas = 0
        End If
      End If
    End If

    If t Mod 15 = 0 Then Registrar "Aguardando a planilha (" & t & "s): " & motivo
    If t Mod 60 = 0 Then Registrar "Excel: " & InfoExcel()
    WScript.Sleep 1000
  Loop
End Function

' Copia o arquivo (o Excel pode estar com ele aberto: tenta algumas vezes).
Function CopiarArquivo(origem, destino)
  On Error Resume Next
  Dim n
  CopiarArquivo = False
  n = 0
  Do While n < 30
    n = n + 1
    Err.Clear
    fso.CopyFile origem, destino, True
    If Err.Number = 0 Then
      CopiarArquivo = True
      Exit Function
    End If
    WScript.Sleep 2000
  Loop
End Function

Function Existe(id)
  Existe = Not (session.findById(id, False) Is Nothing)
End Function

' Primeira coisa: anota que o robo abriu (se este arquivo nao aparecer, o script nao rodou).
Registrar "Script aberto (versao 8) em " & PASTA
If Not silencioso Then sh.Popup "Robo IW38 iniciado. Procurando o SAP...", 3, "Robo IW38", 64 + 4096

' ---------- 1. SAP aberto e logado ----------
Dim SapGuiAuto, application, connection, session
On Error Resume Next
Set SapGuiAuto = GetObject("SAPGUI")
If Err.Number <> 0 Then Falhar "O SAP nao esta aberto. Abra o SAP, faca login e rode o robo de novo."
Set application = SapGuiAuto.GetScriptingEngine
Set connection = application.Children(0)
Set session = connection.Children(0)
If Err.Number <> 0 Then Falhar "Nao achei uma sessao do SAP logada. Faca login e rode de novo."
On Error GoTo 0

If Not silencioso Then
  If MsgBox("O robo vai usar o SAP por alguns minutos para exportar a IW38." & vbCrLf & _
            "Nao mexa no SAP ate aparecer a mensagem de fim." & vbCrLf & vbCrLf & "Continuar?", _
            vbOKCancel + vbInformation + 4096, "Robo IW38") <> vbOK Then WScript.Quit 0
End If
Registrar "Inicio"

' ---------- 2. IW38 com os filtros ----------
On Error Resume Next
session.findById("wnd[0]").maximize
session.findById("wnd[0]/tbar[0]/okcd").text = "/nIW38"
session.findById("wnd[0]").sendVKey 0
session.findById("wnd[0]/usr/chkDY_MAB").selected = True
session.findById("wnd[0]/usr/ctxtDATUV").text = DATA_DE
session.findById("wnd[0]/usr/ctxtDATUB").text = DATA_ATE
session.findById("wnd[0]/usr/btn%_INGPR_%_APP_%-VALU_PUSH").press
Dim i
For i = 0 To UBound(GRUPOS)
  session.findById("wnd[1]/usr/tabsTAB_STRIP/tabpSIVA/ssubSCREEN_HEADER:SAPLALDB:3010/tblSAPLALDBSINGLE/ctxtRSCSEL_255-SLOW_I[1," & i & "]").text = GRUPOS(i)
Next
session.findById("wnd[1]/tbar[0]/btn[8]").press
session.findById("wnd[0]/usr/ctxtVARIANT").text = LAYOUT
session.findById("wnd[0]").sendVKey 0
If Err.Number <> 0 Then Falhar "Falha ao preencher a tela da IW38: " & Err.Description
Err.Clear

' Executa (pode demorar)
session.findById("wnd[0]/tbar[1]/btn[8]").press
' Janela de aviso que as vezes aparece
If Existe("wnd[1]/usr/btnBUTTON_1") Then session.findById("wnd[1]/usr/btnBUTTON_1").press
If Not Existe("wnd[0]/usr/cntlGRID1/shellcont/shell") Then Falhar "A IW38 nao retornou a lista (nenhuma ordem ou tela diferente da esperada)."

' ---------- 3. Exporta para planilha ----------
' O SAP abre a lista numa planilha do Excel (na memoria, nome "Planilha em Basis (1)").
' O robo espera ela ficar pronta e salva so a aba de dados em PASTA\ARQUIVO.
If fso.FileExists(caminho) Then fso.DeleteFile caminho, True
Dim inicioExport
inicioExport = DateAdd("s", -5, Now)
Dim grid
Set grid = session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell")
On Error Resume Next
grid.setCurrentCell -1, ""
grid.selectAll
grid.contextMenu
grid.selectContextMenuItem "&XXL"
' Janelas de confirmacao do SAP (aplicativo: Microsoft Excel, nome do arquivo etc.)
For i = 1 To 8
  If Not Existe("wnd[1]") Then Exit For
  If Existe("wnd[1]/usr/ctxtDY_PATH") Then
    session.findById("wnd[1]/usr/ctxtDY_PATH").text = PASTA
    session.findById("wnd[1]/usr/ctxtDY_FILENAME").text = ARQUIVO
  End If
  session.findById("wnd[1]/tbar[0]/btn[0]").press
  WScript.Sleep 500
Next
If Err.Number <> 0 Then Falhar "Falha ao exportar a planilha: " & Err.Description
Err.Clear

Dim motivoFinal, achou
achou = EsperarPlanilha(inicioExport, motivoFinal)
Err.Clear
If Not achou Or Not fso.FileExists(caminho) Then
  Falhar "O robo nao conseguiu pegar a planilha do SAP." & vbCrLf & "Ultimo estado: " & motivoFinal & vbCrLf & vbCrLf & "Feche o Excel e rode de novo. Se repetir, mande este texto e o arquivo historico.txt."
End If

' Volta o SAP para a tela inicial
session.findById("wnd[0]/tbar[0]/okcd").text = "/n"
session.findById("wnd[0]").sendVKey 0
Err.Clear
On Error GoTo 0
Registrar "Planilha exportada (" & Round(fso.GetFile(caminho).Size / 1024) & " KB)"

' ---------- 4. Envia para o app ----------
Dim resposta, cmd, codigo, texto, f
resposta = PASTA & "\resposta.txt"
If fso.FileExists(resposta) Then fso.DeleteFile resposta, True
cmd = "cmd /c curl.exe -sS --ssl-no-revoke --max-time 300 -w ""\nHTTP %{http_code}"" " & _
      "-H ""Authorization: Bearer " & TOKEN & """ " & _
      "-F ""arquivo=@" & caminho & """ " & _
      """" & URL_APP & "/api/robo/importar"" > """ & resposta & """ 2>&1"
codigo = sh.Run(cmd, 0, True)
texto = ""
If fso.FileExists(resposta) Then
  Set f = fso.OpenTextFile(resposta, 1)
  If Not f.AtEndOfStream Then texto = f.ReadAll
  f.Close
End If
If codigo <> 0 Or InStr(texto, "HTTP 200") = 0 Then
  Falhar "O envio para o app falhou." & vbCrLf & vbCrLf & texto
End If

texto = Replace(texto, vbLf & "HTTP 200", "")
Registrar texto
If Not silencioso Then MsgBox "Pronto. O app foi atualizado:" & vbCrLf & vbCrLf & texto, vbInformation + 4096, "Robo IW38"
