' =====================================================================
'  Robo IW38 - Central de Abastecimento
'  1) Exporta a IW38 do SAP (SAP precisa estar ABERTO e LOGADO)
'  2) Salva em C:\RoboAbastecimento\IW38.xlsx
'  3) Envia para o app, que atualiza e registra "O que mudou"
'
'  Uso: dois cliques. Para rodar sem janelas (Agendador do Windows):
'       wscript.exe robo-iw38.vbs /silencioso
'  Historico de cada execucao: C:\RoboAbastecimento\historico.txt
'
'  ATENCAO: este arquivo contem a CHAVE DO ROBO. Nao envie por e-mail
'  nem deixe em pasta compartilhada.
' =====================================================================
Option Explicit

Const URL_APP = "{{URL_APP}}"
Const TOKEN = "{{TOKEN}}"
Const PASTA = "C:\RoboAbastecimento"
Const ARQUIVO = "IW38.xlsx"
Const LAYOUT = "/CLAUDINEIA"
Const DATA_DE = "13.09.2021"
Const DATA_ATE = "31.12.2029"
Dim GRUPOS : GRUPOS = Array("5I6", "5I7", "5I8", "5IS", "5I3", "5I5", "8IS", "8IT")

Dim fso, sh, silencioso, caminho, historico
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
silencioso = False
If WScript.Arguments.Count > 0 Then silencioso = (LCase(WScript.Arguments(0)) = "/silencioso")
If Not fso.FolderExists(PASTA) Then fso.CreateFolder PASTA
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
' O SAP abre a lista direto no Excel (nao salva em disco). Aqui pegamos essa
' planilha aberta e salvamos em PASTA\ARQUIVO.
If fso.FileExists(caminho) Then fso.DeleteFile caminho, True
Dim grid
Set grid = session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell")
On Error Resume Next
grid.setCurrentCell -1, ""
grid.selectAll
grid.contextMenu
grid.selectContextMenuItem "&XXL"
' Janelas de confirmacao do SAP (formato da planilha etc.)
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

' Espera a planilha aparecer no Excel (ate 3 minutos) e salva
Dim excel, wbExp, espera, ok
ok = False
For espera = 1 To 180
  If fso.FileExists(caminho) Then
    ok = True
    Exit For
  End If
  Set excel = Nothing
  Set excel = GetObject(, "Excel.Application")
  If Err.Number = 0 Then
    If excel.Workbooks.Count > 0 Then
      ' Espera o SAP terminar de preencher a planilha
      WScript.Sleep 4000
      Set wbExp = excel.ActiveWorkbook
      excel.DisplayAlerts = False
      wbExp.SaveAs caminho, 51
      If Err.Number = 0 Then
        wbExp.Close False
        ok = True
        Exit For
      End If
    End If
  End If
  Err.Clear
  WScript.Sleep 1000
Next
Err.Clear
If Not ok Or Not fso.FileExists(caminho) Then Falhar "O robo nao conseguiu salvar " & caminho & ". A planilha do SAP nao apareceu no Excel. Confira se o Excel esta instalado e rode de novo."

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
