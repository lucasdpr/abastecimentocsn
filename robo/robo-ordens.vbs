' =====================================================================
'  Robo ORDENS - Central de Abastecimento
'  1) Roda a IW38 e salva em Desktop\robo IW38 (lista de ordens do dia)
'  2) Le as ordens dessa planilha e cola na ZPMX0018 (selecao multipla)
'  3) Salva a ZPMX0018 em Desktop\robo ordens
'  4) Envia para o app (base Ordens - itens de reserva), que atualiza
'     e registra "O que mudou"
'
'  SAP precisa estar ABERTO e LOGADO. Uso: dois cliques.
'  Para rodar sem janelas (Agendador do Windows):
'       wscript.exe robo-ordens.vbs /silencioso
'  Historico de cada execucao: Desktop\robo ordens\historico.txt
'
'  ATENCAO: este arquivo contem a CHAVE DO ROBO. Nao envie por e-mail
'  nem deixe em pasta compartilhada.
' =====================================================================
Option Explicit

Const URL_APP = "{{URL_APP}}"
Const TOKEN = "{{TOKEN}}"
Const FORMATO_XLSX = "10"
' A Vercel aceita ~4,5 MB por envio: planilhas maiores vao em partes.
Const PARTE_BYTES = 3000000

' IW38 (gravacao IW38novo)
Const IW38_LAYOUT = "/CLAUDINEIA"
Const IW38_DE = "13.09.2021"
Const IW38_ATE = "21.12.2029"
Dim GRUPOS : GRUPOS = Array("5I6", "5I7", "5I8", "5IS", "5I3", "5I5", "8IS", "8IT")

' ZPMX0018 (gravacao zpmx0018)
Const ZPM_CENTRO = "01"
Const ZPM_DE = "13.09.2021"
Const ZPM_ATE = "31.12.2029"
Const ZPM_LAYOUT = "/FIALHO"

Dim fso, sh, silencioso, historico, desktop, pastaIw38, pastaOrdens
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
desktop = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop"
pastaIw38 = desktop & "\robo IW38"
pastaOrdens = desktop & "\robo ordens"
If Not fso.FolderExists(pastaIw38) Then fso.CreateFolder pastaIw38
If Not fso.FolderExists(pastaOrdens) Then fso.CreateFolder pastaOrdens
historico = pastaOrdens & "\historico.txt"
silencioso = False
If WScript.Arguments.Count > 0 Then silencioso = (LCase(WScript.Arguments(0)) = "/silencioso")

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
  If MsgBox("O robo vai usar o SAP por alguns minutos (IW38 e ZPMX0018)." & vbCrLf & _
            "Nao mexa no SAP ate aparecer a mensagem de fim." & vbCrLf & vbCrLf & "Continuar?", _
            vbOKCancel + vbInformation, "Robo ORDENS") <> vbOK Then WScript.Quit 0
End If
Registrar "Inicio"

' ---------- 2. IW38: lista de ordens do dia ----------
Dim i, inicioEtapa, planilhaIw38
On Error Resume Next
session.findById("wnd[0]").maximize
session.findById("wnd[0]/tbar[0]/okcd").text = "/nIW38"
session.findById("wnd[0]").sendVKey 0
session.findById("wnd[0]/usr/chkDY_MAB").selected = True
session.findById("wnd[0]/usr/ctxtDATUV").text = IW38_DE
session.findById("wnd[0]/usr/ctxtDATUB").text = IW38_ATE
session.findById("wnd[0]/usr/btn%_INGPR_%_APP_%-VALU_PUSH").press
For i = 0 To UBound(GRUPOS)
  session.findById("wnd[1]/usr/tabsTAB_STRIP/tabpSIVA/ssubSCREEN_HEADER:SAPLALDB:3010/tblSAPLALDBSINGLE/ctxtRSCSEL_255-SLOW_I[1," & i & "]").text = GRUPOS(i)
Next
session.findById("wnd[1]/tbar[0]/btn[8]").press
session.findById("wnd[0]/usr/ctxtVARIANT").text = IW38_LAYOUT
If Err.Number <> 0 Then Falhar "Falha ao preencher a tela da IW38: " & Err.Description
Err.Clear
session.findById("wnd[0]/tbar[1]/btn[8]").press
If Existe("wnd[1]/usr/btnBUTTON_1") Then session.findById("wnd[1]/usr/btnBUTTON_1").press
If Not Existe("wnd[0]/usr/cntlGRID1/shellcont/shell") Then Falhar "A IW38 nao retornou a lista (nenhuma ordem ou tela diferente da esperada)."

LimparPlanilhas pastaIw38
inicioEtapa = Now
Dim grid
Set grid = session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell")
grid.setCurrentCell -1, ""
grid.selectAll
grid.contextMenu
grid.selectContextMenuItem "&XXL"
SalvarComo pastaIw38, "IW38.xlsx"
If Err.Number <> 0 Then Falhar "Falha ao exportar a IW38: " & Err.Description
On Error GoTo 0
planilhaIw38 = EsperarPlanilha(pastaIw38, inicioEtapa)
Registrar "IW38 exportada (" & Round(fso.GetFile(planilhaIw38).Size / 1024) & " KB)"

' ---------- 3. Le as ordens da IW38 e copia para a area de transferencia ----------
Dim ordens, qtdOrdens
ordens = LerOrdens(planilhaIw38, qtdOrdens)
If qtdOrdens = 0 Then Falhar "A planilha da IW38 nao tem nenhuma ordem (coluna 'Ordem')."
CopiarTexto ordens
Registrar qtdOrdens & " ordens copiadas da IW38"

' ---------- 4. ZPMX0018 com as ordens ----------
On Error Resume Next
session.findById("wnd[0]/tbar[0]/okcd").text = "/nZPMX0018"
session.findById("wnd[0]").sendVKey 0
session.findById("wnd[0]/usr/chkP_ENCE").selected = True
session.findById("wnd[0]/usr/ctxtS_SWERK-LOW").text = ZPM_CENTRO
session.findById("wnd[0]/usr/ctxtS_ERDAT-LOW").text = ZPM_DE
session.findById("wnd[0]/usr/ctxtS_ERDAT-HIGH").text = ZPM_ATE
session.findById("wnd[0]/usr/btn%_S_AUFNR_%_APP_%-VALU_PUSH").press
' Carregar da area de transferencia (Shift+F12) e confirmar (F8)
session.findById("wnd[1]/tbar[0]/btn[24]").press
session.findById("wnd[1]/tbar[0]/btn[8]").press
session.findById("wnd[0]/usr/ctxtP_LAYOUT").text = ZPM_LAYOUT
If Err.Number <> 0 Then Falhar "Falha ao preencher a tela da ZPMX0018: " & Err.Description
Err.Clear
session.findById("wnd[0]/tbar[1]/btn[8]").press
If Existe("wnd[1]/usr/btnBUTTON_1") Then session.findById("wnd[1]/usr/btnBUTTON_1").press
If Not Existe("wnd[0]/usr/cntlCC_ALV/shellcont/shell") Then Falhar "A ZPMX0018 nao retornou a lista (nenhum item ou tela diferente da esperada)."

LimparPlanilhas pastaOrdens
inicioEtapa = Now
Set grid = session.findById("wnd[0]/usr/cntlCC_ALV/shellcont/shell")
grid.pressToolbarContextButton "&MB_EXPORT"
grid.selectContextMenuItem "&XXL"
SalvarComo pastaOrdens, "ORDENS.xlsx"
If Err.Number <> 0 Then Falhar "Falha ao exportar a ZPMX0018: " & Err.Description
On Error GoTo 0
Dim planilhaOrdens
planilhaOrdens = EsperarPlanilha(pastaOrdens, inicioEtapa)
Registrar "ZPMX0018 exportada (" & Round(fso.GetFile(planilhaOrdens).Size / 1024) & " KB)"

On Error Resume Next
session.findById("wnd[0]/tbar[0]/okcd").text = "/n"
session.findById("wnd[0]").sendVKey 0
On Error GoTo 0

' ---------- 5. Envia para o app ----------
Dim resultado
resultado = EnviarPlanilha(planilhaOrdens)
Registrar resultado
If Not silencioso Then MsgBox "Pronto. O app foi atualizado:" & vbCrLf & vbCrLf & resultado, vbInformation, "Robo ORDENS"


' =====================================================================
'  Funcoes
' =====================================================================
Sub Registrar(msg)
  Dim f
  Set f = fso.OpenTextFile(historico, 8, True)
  f.WriteLine Now & "  " & msg
  f.Close
End Sub

Sub Falhar(msg)
  Registrar "ERRO: " & msg
  If Not silencioso Then MsgBox msg, vbCritical, "Robo ORDENS"
  WScript.Quit 1
End Sub

Function Existe(id)
  Existe = Not (session.findById(id, False) Is Nothing)
End Function

' Apaga as planilhas antigas da pasta para nao confundir com a nova.
Sub LimparPlanilhas(pasta)
  Dim arq
  On Error Resume Next
  For Each arq In fso.GetFolder(pasta).Files
    If LCase(fso.GetExtensionName(arq.Name)) = "xlsx" Then fso.DeleteFile arq.Path, True
  Next
  Err.Clear
End Sub

' Janelas do SAP depois de "Planilha": formato (XLSX) e onde salvar.
Sub SalvarComo(pasta, nome)
  If Existe("wnd[1]/usr/cmbG_LISTBOX") Then
    session.findById("wnd[1]/usr/cmbG_LISTBOX").key = FORMATO_XLSX
    session.findById("wnd[1]/tbar[0]/btn[0]").press
  End If
  If Existe("wnd[1]/usr/ctxtDY_PATH") Then
    session.findById("wnd[1]/usr/ctxtDY_PATH").text = pasta
    If Existe("wnd[1]/usr/ctxtDY_FILENAME") Then session.findById("wnd[1]/usr/ctxtDY_FILENAME").text = nome
    session.findById("wnd[1]/tbar[0]/btn[0]").press
  Else
    Registrar "Aviso: janela de pasta nao apareceu como esperado (" & pasta & ")"
  End If
End Sub

' Espera ate 10 minutos a planilha nova (criada depois de "desde") ficar completa.
' Na 1a vez o SAP pergunta "Permitir o acesso a esse file?": clicar Permitir e marcar "Memorizar minha decisao".
Function EsperarPlanilha(pasta, desde)
  Dim espera, arq, caminho, tamanho, anterior, limite
  limite = DateAdd("s", -5, desde)
  anterior = -1
  For espera = 1 To 600
    ' Ignora o arquivo temporario do Excel (~$...) e planilhas antigas; pega a maior.
    caminho = ""
    For Each arq In fso.GetFolder(pasta).Files
      If LCase(fso.GetExtensionName(arq.Name)) = "xlsx" And Left(arq.Name, 2) <> "~$" And arq.DateLastModified >= limite Then
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
  If caminho = "" Then Falhar "O SAP nao salvou nenhuma planilha nova em " & pasta & ". Veja se alguma janela ficou aberta no SAP."
  If fso.GetFile(caminho).Size < 10240 Then Falhar "A planilha ficou vazia (" & caminho & ")." & vbCrLf & _
    "Se o SAP perguntou 'Permitir o acesso a esse file?', clique Permitir e marque 'Memorizar minha decisao'. Depois rode de novo."
  EsperarPlanilha = caminho
End Function

' Le a coluna "Ordem" da planilha (pelo Excel, numa copia) e devolve uma ordem por linha, sem repetir.
Function LerOrdens(caminho, ByRef qtd)
  Dim copia, xl, wb, ws, c, col, ultima, valores, r, v, vistos
  qtd = 0
  LerOrdens = ""
  copia = sh.ExpandEnvironmentStrings("%TEMP%") & "\robo-iw38-leitura.xlsx"
  On Error Resume Next
  fso.CopyFile caminho, copia, True
  If Err.Number <> 0 Then Falhar "Nao consegui copiar a planilha da IW38: " & Err.Description
  Set xl = CreateObject("Excel.Application")
  If Err.Number <> 0 Then Falhar "Nao consegui abrir o Excel para ler a IW38: " & Err.Description
  xl.Visible = False
  xl.DisplayAlerts = False
  Set wb = xl.Workbooks.Open(copia, 0, True)
  If Err.Number <> 0 Then
    xl.Quit
    Falhar "O Excel nao abriu a planilha da IW38: " & Err.Description
  End If
  Set ws = wb.Worksheets(1)
  col = 0
  For c = 1 To ws.UsedRange.Columns.Count
    If Trim(CStr(ws.Cells(1, c).Value)) = "Ordem" Then
      col = c
      Exit For
    End If
  Next
  Set vistos = CreateObject("Scripting.Dictionary")
  If col > 0 Then
    ultima = ws.Cells(ws.Rows.Count, col).End(-4162).Row
    If ultima >= 2 Then
      valores = ws.Range(ws.Cells(2, col), ws.Cells(ultima, col)).Value
      If IsArray(valores) Then
        For r = 1 To UBound(valores, 1)
          v = Trim(CStr(valores(r, 1)))
          If v <> "" And Not vistos.Exists(v) Then vistos.Add v, True
        Next
      Else
        v = Trim(CStr(valores))
        If v <> "" Then vistos.Add v, True
      End If
    End If
  End If
  wb.Close False
  xl.Quit
  Set xl = Nothing
  fso.DeleteFile copia, True
  Err.Clear
  On Error GoTo 0
  If col = 0 Then Falhar "Nao achei a coluna 'Ordem' na planilha da IW38."
  qtd = vistos.Count
  If qtd > 0 Then LerOrdens = Join(vistos.Keys, vbCrLf)
End Function

' Coloca o texto na area de transferencia do Windows (clip.exe).
Sub CopiarTexto(texto)
  Dim tmp, f
  tmp = sh.ExpandEnvironmentStrings("%TEMP%") & "\robo-ordens.txt"
  Set f = fso.CreateTextFile(tmp, True, False)
  f.Write texto & vbCrLf
  f.Close
  sh.Run "cmd /c clip < """ & tmp & """", 0, True
End Sub

' Envia a planilha em partes de ate PARTE_BYTES (o app junta e importa na ultima).
' Usa a conexao do Windows (mesma do navegador e do proxy da empresa).
Function EnviarPlanilha(caminho)
  Dim copia, todo, total, envio, parte, bytes, status, texto, erro
  copia = sh.ExpandEnvironmentStrings("%TEMP%") & "\robo-envio.tmp"
  On Error Resume Next
  ' O SAP abre a planilha no Excel, que trava o arquivo: le uma copia.
  fso.CopyFile caminho, copia, True
  If Err.Number <> 0 Then Falhar "Nao consegui copiar a planilha para enviar (feche o Excel): " & Err.Description
  Set todo = CreateObject("ADODB.Stream")
  todo.Type = 1
  todo.Open
  todo.LoadFromFile copia
  If Err.Number <> 0 Or todo.Size = 0 Then Falhar "Nao consegui ler a planilha para enviar: " & Err.Description
  On Error GoTo 0
  total = Int((todo.Size - 1) / PARTE_BYTES) + 1
  Randomize
  envio = "r" & Year(Now) & Right("0" & Month(Now), 2) & Right("0" & Day(Now), 2) & "-" & Int(Rnd * 1000000000)
  For parte = 1 To total
    todo.Position = (parte - 1) * PARTE_BYTES
    bytes = todo.Read(PARTE_BYTES)
    EnviarParte bytes, envio, parte, total, status, texto, erro
    If parte < total Then
      If status <> 202 Then Falhar "O envio para o app falhou (parte " & parte & " de " & total & ")." & vbCrLf & vbCrLf & erro & vbCrLf & texto
    ElseIf status <> 200 Then
      Falhar "O envio para o app falhou." & vbCrLf & vbCrLf & erro & vbCrLf & texto & vbCrLf & vbCrLf & _
        "Teste: abra " & URL_APP & " no navegador deste PC."
    End If
  Next
  todo.Close
  fso.DeleteFile copia, True
  EnviarPlanilha = texto
End Function

Sub EnviarParte(bytes, envio, parte, total, ByRef status, ByRef texto, ByRef erro)
  Dim limite, corpo, http
  status = 0 : texto = "" : erro = ""
  On Error Resume Next
  limite = "----RoboOrdens" & envio & "p" & parte
  Set corpo = CreateObject("ADODB.Stream")
  corpo.Type = 1
  corpo.Open
  EscreverTexto corpo, Campo(limite, "envio", envio) & Campo(limite, "parte", parte) & Campo(limite, "total", total) & _
    "--" & limite & vbCrLf & _
    "Content-Disposition: form-data; name=""arquivo""; filename=""ORDENS.xlsx""" & vbCrLf & _
    "Content-Type: application/octet-stream" & vbCrLf & vbCrLf
  corpo.Write bytes
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
  If status <> 200 And status <> 202 Then erro = "HTTP " & status
End Sub

Function Campo(limite, nome, valor)
  Campo = "--" & limite & vbCrLf & "Content-Disposition: form-data; name=""" & nome & """" & vbCrLf & vbCrLf & valor & vbCrLf
End Function

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
