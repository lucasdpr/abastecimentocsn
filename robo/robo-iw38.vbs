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
On Error Resume Next
For Each arq In fso.GetFolder(PASTA).Files
  If LCase(fso.GetExtensionName(arq.Name)) = "xlsx" Then fso.DeleteFile arq.Path, True
Next
Err.Clear
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

' Espera o arquivo ficar pronto (ate 10 minutos). Aceita o nome que o SAP usar (ex.: export.XLSX).
' Na 1a vez o SAP pergunta "Permitir o acesso a esse file?": clicar Permitir e marcar "Memorizar minha decisao".
Dim espera, tamanho, anterior
anterior = -1
caminho = ""
For espera = 1 To 600
  ' Ignora o arquivo temporario do Excel (~$IW38.xlsx) e pega a maior planilha.
  caminho = ""
  For Each arq In fso.GetFolder(PASTA).Files
    If LCase(fso.GetExtensionName(arq.Name)) = "xlsx" And Left(arq.Name, 2) <> "~$" Then
      If caminho = "" Then
        caminho = arq.Path
      ElseIf arq.Size > fso.GetFile(caminho).Size Then
        caminho = arq.Path
      End If
    End If
  Next
  If caminho <> "" Then
    tamanho = fso.GetFile(caminho).Size
    If tamanho >= 10240 And tamanho = anterior Then Exit For
    anterior = tamanho
  End If
  WScript.Sleep 1000
Next
If caminho = "" Then Falhar "O SAP nao salvou nenhuma planilha .xlsx em " & PASTA & ". Veja se alguma janela ficou aberta no SAP."
If fso.GetFile(caminho).Size < 10240 Then Falhar "A planilha ficou vazia (" & caminho & ")." & vbCrLf & _
  "Se o SAP perguntou 'Permitir o acesso a esse file?', clique Permitir e marque 'Memorizar minha decisao'. Depois rode de novo."

On Error Resume Next
session.findById("wnd[0]/tbar[0]/okcd").text = "/n"
session.findById("wnd[0]").sendVKey 0
On Error GoTo 0
Registrar "Planilha exportada (" & Round(fso.GetFile(caminho).Size / 1024) & " KB)"

' ---------- 4. Envia para o app ----------
' Usa a mesma conexao do navegador (proxy da empresa). Se falhar, tenta pelo curl.
Dim status, texto, erroHttp
EnviarHttp caminho, status, texto, erroHttp
If status <> 200 Then
  Dim resposta, cmd, codigo, f, textoCurl
  resposta = PASTA & "\resposta.txt"
  If fso.FileExists(resposta) Then fso.DeleteFile resposta, True
  cmd = "cmd /c curl.exe -sS --ssl-no-revoke --max-time 300 -w ""\nHTTP %{http_code}"" " & _
        "-H ""Authorization: Bearer " & TOKEN & """ " & _
        "-F ""arquivo=@" & caminho & """ " & _
        """" & URL_APP & "/api/robo/importar"" > """ & resposta & """ 2>&1"
  codigo = sh.Run(cmd, 0, True)
  textoCurl = ""
  If fso.FileExists(resposta) Then
    Set f = fso.OpenTextFile(resposta, 1)
    If Not f.AtEndOfStream Then textoCurl = f.ReadAll
    f.Close
  End If
  If codigo <> 0 Or InStr(textoCurl, "HTTP 200") = 0 Then
    Falhar "O envio para o app falhou." & vbCrLf & vbCrLf & _
      "Pela conexao do Windows: " & erroHttp & " " & texto & vbCrLf & vbCrLf & _
      "Pelo curl: " & textoCurl & vbCrLf & vbCrLf & _
      "Teste: abra " & URL_APP & " no navegador deste PC."
  End If
  texto = Replace(textoCurl, vbLf & "HTTP 200", "")
End If

Registrar texto
If Not silencioso Then MsgBox "Pronto. O app foi atualizado:" & vbCrLf & vbCrLf & texto, vbInformation, "Robo IW38"

' Envia a planilha (multipart, campo "arquivo") usando a conexao do Windows (mesma do navegador).
Sub EnviarHttp(arquivo, ByRef status, ByRef texto, ByRef erro)
  Dim limite, corpo, dados, http
  status = 0 : texto = "" : erro = ""
  On Error Resume Next
  limite = "----RoboIW38" & Replace(CStr(Timer), ",", "")
  limite = Replace(limite, ".", "")
  Set corpo = CreateObject("ADODB.Stream")
  corpo.Type = 1
  corpo.Open
  EscreverTexto corpo, "--" & limite & vbCrLf & _
    "Content-Disposition: form-data; name=""arquivo""; filename=""IW38.xlsx""" & vbCrLf & _
    "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" & vbCrLf & vbCrLf
  ' O SAP abre a planilha no Excel, que trava o arquivo: le uma copia.
  Dim copia
  copia = PASTA & "\envio.tmp"
  fso.CopyFile arquivo, copia, True
  If Err.Number <> 0 Then
    erro = "nao consegui copiar a planilha (feche o Excel): " & Err.Description
    Err.Clear
    Exit Sub
  End If
  Set dados = CreateObject("ADODB.Stream")
  dados.Type = 1
  dados.Open
  dados.LoadFromFile copia
  If Err.Number <> 0 Or dados.Size = 0 Then
    erro = "nao consegui ler a planilha: " & Err.Description
    Err.Clear
    Exit Sub
  End If
  dados.CopyTo corpo
  dados.Close
  fso.DeleteFile copia, True
  EscreverTexto corpo, vbCrLf & "--" & limite & "--" & vbCrLf
  corpo.Position = 0
  Set http = CreateObject("MSXML2.XMLHTTP.6.0")
  If Err.Number <> 0 Then
    Err.Clear
    Set http = CreateObject("MSXML2.XMLHTTP")
  End If
  http.open "POST", URL_APP & "/api/robo/importar", False
  http.setRequestHeader "Authorization", "Bearer " & TOKEN
  http.setRequestHeader "Content-Type", "multipart/form-data; boundary=" & limite
  http.send corpo.Read
  corpo.Close
  If Err.Number <> 0 Then
    erro = "erro " & Hex(Err.Number) & " " & Err.Description
    Err.Clear
    Exit Sub
  End If
  status = http.status
  texto = http.responseText
  If status <> 200 Then erro = "HTTP " & status
End Sub

Sub EscreverTexto(destino, textoAscii)
  Dim t
  Set t = CreateObject("ADODB.Stream")
  t.Type = 2
  t.Charset = "us-ascii"
  t.Open
  t.WriteText textoAscii
  t.Position = 0
  t.Type = 1
  destino.Write t.Read
  t.Close
End Sub
