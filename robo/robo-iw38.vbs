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

Dim fso, sh, silencioso, caminho, historico, PASTA
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
silencioso = False
If WScript.Arguments.Count > 0 Then silencioso = (LCase(WScript.Arguments(0)) = "/silencioso")
' Tudo (planilha, historico) fica na pasta onde este arquivo esta.
PASTA = fso.GetParentFolderName(WScript.ScriptFullName)
caminho = PASTA & "\" & ARQUIVO
historico = PASTA & "\historico.txt"

Sub Registrar(msg)
  Dim f
  Set f = fso.OpenTextFile(historico, 8, True)
  f.WriteLine Now & "  " & msg
  f.Close
End Sub

Sub Falhar(msg)
  Registrar "ERRO: " & msg
  If Not silencioso Then MsgBox msg, vbCritical, "Robo IW38"
  WScript.Quit 1
End Sub

' Acha, entre todos os arquivos abertos no Excel, a aba com a lista do SAP
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

Function Existe(id)
  Existe = Not (session.findById(id, False) Is Nothing)
End Function

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
            vbOKCancel + vbInformation, "Robo IW38") <> vbOK Then WScript.Quit 0
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

' ---------- 3. Exporta para planilha em pasta fixa ----------
' O SAP abre a lista direto no Excel (nao salva em disco). Esperamos o SAP
' terminar de preencher a planilha e salvamos so a aba com os dados em
' PASTA\ARQUIVO.
If fso.FileExists(caminho) Then fso.DeleteFile caminho, True
Dim grid
Set grid = session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell")
On Error Resume Next
grid.setCurrentCell -1, ""
grid.selectAll
grid.contextMenu
grid.selectContextMenuItem "&XXL"
' Janelas de confirmacao do SAP (aplicativo: Microsoft Excel etc.)
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

' Espera a planilha do SAP aparecer no Excel, terminar de carregar, e salva.
Dim excel, wsSap, wbSap, tentativa, ok, linhas, linhasAntes, estavel, motivo, novoWb
ok = False
linhasAntes = -1
estavel = 0
motivo = "Excel ainda nao abriu"
For tentativa = 1 To 420
  If fso.FileExists(caminho) Then
    ok = True
    Exit For
  End If
  Err.Clear
  Set excel = Nothing
  Set excel = GetObject(, "Excel.Application")
  If Err.Number <> 0 Then
    motivo = "nao achei o Excel aberto (" & Err.Description & ")"
    Err.Clear
  Else
    Set wsSap = Nothing
    Set wsSap = AcharAbaSap(excel)
    If wsSap Is Nothing Then
      motivo = "Excel aberto (" & excel.Workbooks.Count & " arquivo(s)), mas sem a lista do SAP ainda"
      Err.Clear
    Else
      linhas = wsSap.UsedRange.Rows.Count
      If Err.Number <> 0 Then
        motivo = "Excel ocupado (" & Err.Description & ")"
        Err.Clear
      ElseIf linhas = linhasAntes And excel.Ready Then
        estavel = estavel + 1
      Else
        estavel = 0
        motivo = "SAP ainda preenchendo a planilha (" & linhas & " linhas)"
      End If
      linhasAntes = linhas
      ' Estavel por 3 verificacoes seguidas = SAP terminou de preencher
      If estavel >= 3 Then
        Set wbSap = wsSap.Parent
        excel.DisplayAlerts = False
        wsSap.Copy
        If Err.Number = 0 Then
          Set novoWb = excel.ActiveWorkbook
          novoWb.SaveAs caminho, 51
          If Err.Number = 0 Then
            novoWb.Close False
            ok = True
          Else
            motivo = "falha ao salvar a copia (" & Err.Description & ")"
          End If
        Else
          motivo = "falha ao copiar a aba (" & Err.Description & ")"
          Err.Clear
          wbSap.SaveCopyAs caminho
          If Err.Number = 0 Then ok = True Else motivo = motivo & " / SaveCopyAs: " & Err.Description
        End If
        Err.Clear
        If ok Then
          wbSap.Close False
          Exit For
        End If
        estavel = 0
      End If
    End If
  End If
  If tentativa Mod 15 = 0 Then Registrar "Aguardando a planilha (" & tentativa & "s): " & motivo
  WScript.Sleep 1000
Next
Err.Clear
If Not ok Or Not fso.FileExists(caminho) Then Falhar "O robo nao conseguiu salvar " & caminho & "." & vbCrLf & "Ultimo estado: " & motivo & vbCrLf & vbCrLf & "Feche o Excel e rode de novo. Se repetir, mande este texto e o arquivo historico.txt."

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
If Not silencioso Then MsgBox "Pronto. O app foi atualizado:" & vbCrLf & vbCrLf & texto, vbInformation, "Robo IW38"
