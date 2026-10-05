' =====================================================================
'  Robo IW38 - Central de Abastecimento
'  1) Exporta a IW38 do SAP (SAP precisa estar ABERTO e LOGADO)
'  2) Salva em Desktop\robo IW38\IW38.xlsx (formato XLSX, direto em arquivo)
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
Dim PASTA
Const ARQUIVO = "IW38.xlsx"
Const LAYOUT = "/CLAUDINEIA"
Const DATA_DE = "13.09.2021"
Const DATA_ATE = "21.12.2029"
Const FORMATO_XLSX = "10"
Dim GRUPOS : GRUPOS = Array("5I6", "5I7", "5I8", "5IS", "5I3", "5I5", "8IS", "8IT")

Dim fso, sh, silencioso, caminho, historico
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
PASTA = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop\robo IW38"
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

' ---------- 2. IW38 com os filtros (igual a gravacao feita no SAP) ----------
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
If Err.Number <> 0 Then Falhar "Falha ao preencher a tela da IW38: " & Err.Description
Err.Clear

' Executa (pode demorar)
session.findById("wnd[0]/tbar[1]/btn[8]").press
' Janela de aviso que as vezes aparece
If Existe("wnd[1]/usr/btnBUTTON_1") Then session.findById("wnd[1]/usr/btnBUTTON_1").press
If Not Existe("wnd[0]/usr/cntlGRID1/shellcont/shell") Then Falhar "A IW38 nao retornou a lista (nenhuma ordem ou tela diferente da esperada)."

' ---------- 3. Exporta direto para arquivo XLSX na pasta ----------
' Limpa exportacoes antigas para nao confundir com a nova.
Dim arq
For Each arq In fso.GetFolder(PASTA).Files
  If LCase(fso.GetExtensionName(arq.Name)) = "xlsx" Then fso.DeleteFile arq.Path, True
Next
Dim grid
Set grid = session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell")
grid.setCurrentCell -1, ""
grid.selectAll
grid.contextMenu
grid.selectContextMenuItem "&XXL"
' 1a janela: formato do arquivo (10 = XLSX, igual a gravacao)
If Existe("wnd[1]/usr/cmbG_LISTBOX") Then
  session.findById("wnd[1]/usr/cmbG_LISTBOX").key = FORMATO_XLSX
  session.findById("wnd[1]/tbar[0]/btn[0]").press
End If
' 2a janela: pasta e nome do arquivo
If Existe("wnd[1]/usr/ctxtDY_PATH") Then
  session.findById("wnd[1]/usr/ctxtDY_PATH").text = PASTA
  If Existe("wnd[1]/usr/ctxtDY_FILENAME") Then session.findById("wnd[1]/usr/ctxtDY_FILENAME").text = ARQUIVO
  session.findById("wnd[1]/tbar[0]/btn[0]").press
Else
  Registrar "Aviso: janela de pasta nao apareceu como esperado"
End If
If Err.Number <> 0 Then Falhar "Falha ao exportar a planilha: " & Err.Description
On Error GoTo 0

' Espera o arquivo ficar pronto (ate 3 minutos). Aceita o nome que o SAP usar (ex.: export.XLSX).
Dim espera, tamanho, anterior
anterior = -1
caminho = ""
For espera = 1 To 180
  For Each arq In fso.GetFolder(PASTA).Files
    If LCase(fso.GetExtensionName(arq.Name)) = "xlsx" Then caminho = arq.Path
  Next
  If caminho <> "" Then
    tamanho = fso.GetFile(caminho).Size
    If tamanho > 0 And tamanho = anterior Then Exit For
    anterior = tamanho
  End If
  WScript.Sleep 1000
Next
If caminho = "" Then Falhar "O SAP nao salvou nenhuma planilha .xlsx em " & PASTA & ". Veja se alguma janela ficou aberta no SAP."

On Error Resume Next
session.findById("wnd[0]/tbar[0]/okcd").text = "/n"
session.findById("wnd[0]").sendVKey 0
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
